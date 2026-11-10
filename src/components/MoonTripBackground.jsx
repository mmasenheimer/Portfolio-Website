import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

// LiDAR-style canyon scan: scattered points over a winding canyon with
// fractured rock slabs on either side, plus tall faceted crags jutting up
// from the rim. Points are coloured by how much their surface faces the
// light: lit faces glow green, the rest fall off to teal and navy.

// Shared by both vertex shaders (terrain points and crag points)
const common = /* glsl */ `
  uniform float uTime;

  const float TAU = 6.2831853;
  const float TRAVEL = 0.25;      // how fast the terrain flows toward the camera
  const float CRAG_PERIOD = 9.0;  // spacing between crags along the canyon
  const float CRAG_SIDES = 7.0;   // facets around each crag's outline

  varying float vLight;
  varying float vHeight;
  varying float vStrata;
  varying float vDepth;
  varying float vRand;
  varying float vVisible;

  // ---- noise ---------------------------------------------------------
  vec2 hash01(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  vec2 hash2(vec2 p) {
    return hash01(p) * 2.0 - 1.0;
  }

  // 2D gradient noise, roughly [-0.7, 0.7]
  float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i), f), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Ridged multifractal: sharp crests, detail piled onto the high ground.
  float ridged(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    float prev = 1.0;
    for (int i = 0; i < 5; i++) {
      float n = 1.0 - clamp(abs(gnoise(p * freq)) * 1.6, 0.0, 1.0);
      n *= n;
      sum += n * amp * prev;
      prev = n;
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum; // ~[0, 1]
  }

  // Voronoi: which irregular cell p falls in (id) and that cell's centre.
  void voronoi(vec2 p, out vec2 cellId, out vec2 cellPos) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float best = 8.0;
    cellId = n;
    cellPos = n;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash01(n + g);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < best) {
          best = d;
          cellId = n + g;
          cellPos = n + g + o;
        }
      }
    }
  }

  // ---- canyon --------------------------------------------------------
  // q is "terrain space": x across the canyon, y along it. The whole
  // landscape slides toward the camera: world z = q.y + uTime * TRAVEL.

  float canyonCenter(float z) {
    return sin(z * 0.18) * 1.0 + sin(z * 0.07 + 1.3) * 0.6;
  }

  float canyonHalfWidth(float z) {
    return 1.6 + gnoise(vec2(z * 0.15, 3.7)) * 0.6;
  }

  // Ground height without the crags: canyon floor plus fractured rim slabs
  float baseHeight(vec2 q) {
    // Distance from the canyon, warped by noise so the rim zigzags
    float d = abs(q.x - canyonCenter(q.y)) + gnoise(q * 0.9) * 0.6 + gnoise(q * 2.3) * 0.25;
    float halfWidth = canyonHalfWidth(q.y);

    // 0 on the canyon floor, 1 up on the rim - a very steep step = cliff wall
    float wall = smoothstep(halfWidth, halfWidth + 0.3, d);

    // Valley floor: low, with rubbly ridges
    float floorH = ridged(q * 0.6) * 0.35 + gnoise(q * 3.0) * 0.05;

    // Rim: each Voronoi cell is its own tilted rock slab at its own height,
    // so neighbouring slabs meet in sharp fractured drops.
    vec2 cellId;
    vec2 cellPos;
    vec2 s = q * 0.55;
    voronoi(s, cellId, cellPos);
    vec2 tilt = hash01(cellId) * 2.0 - 1.0;
    float slab = 2.3
      + hash01(cellId + 7.3).x * 0.9       // per-slab height
      + dot(s - cellPos, tilt) * 0.7;      // per-slab tilt
    slab += (d - halfWidth) * 0.12;        // land keeps rising away from the canyon
    slab += ridged(q * 0.8) * 0.4;         // weathered tops
    slab += gnoise(q * 4.0) * 0.06 + gnoise(q * 9.0) * 0.025; // fine roughness

    return mix(floorH, slab, wall);
  }

  // ---- crags ---------------------------------------------------------
  // Tall faceted rock towers spaced along the canyon, alternating sides.
  // Each stands right at the rim, so its inner face drops all the way to
  // the canyon floor.
  struct Crag {
    vec2 center;  // terrain space
    float radius;
    float top;
    float side;   // -1 = left of the canyon, +1 = right
    float seed;
  };

  Crag cragAt(float k) {
    vec2 h = hash01(vec2(k, 17.0));
    Crag c;
    c.seed = k;
    c.side = mod(k, 2.0) < 0.5 ? -1.0 : 1.0;
    c.radius = 1.5 + h.y * 0.6;
    float z = k * CRAG_PERIOD + (h.x - 0.5) * 2.0;
    c.center = vec2(canyonCenter(z) + c.side * (canyonHalfWidth(z) + c.radius * 0.85), z);
    c.top = 3.6 + h.x * 0.6;
    return c;
  }

  Crag nearestCrag(float z) {
    return cragAt(floor(z / CRAG_PERIOD + 0.5));
  }

  // Faceted, chipped outline: distance from the crag centre at angle theta
  float cragOutline(Crag c, float theta) {
    float a = theta / TAU * CRAG_SIDES;
    float i = floor(a);
    float r0 = hash01(vec2(c.seed * 13.1 + mod(i, CRAG_SIDES), 5.3)).x;
    float r1 = hash01(vec2(c.seed * 13.1 + mod(i + 1.0, CRAG_SIDES), 5.3)).x;
    float r = 0.7 + 0.6 * mix(r0, r1, a - i);                         // straight-ish facets
    r += gnoise(vec2(cos(theta), sin(theta)) * 3.0 + c.seed * 7.7) * 0.08; // chips
    return c.radius * r;
  }

  // Crag top: a tilted slab, highest along the canyon edge, with a broken crest
  float cragTop(Crag c, vec2 q) {
    vec2 v = q - c.center;
    float h = c.top - v.x * c.side * 0.35 + v.y * 0.1;
    h += ridged(q * 1.3 + c.seed) * 0.5;
    h += gnoise(q * 6.0) * 0.05;
    return h;
  }

  // Full terrain height (crags included) at a world ground position
  float heightAt(vec2 xz) {
    vec2 q = vec2(xz.x, xz.y - uTime * TRAVEL);
    float h = baseHeight(q);

    Crag c = nearestCrag(q.y);
    vec2 v = q - c.center;
    float r = length(v);
    if (r < c.radius * 1.45) {
      float edge = cragOutline(c, atan(v.y, v.x));
      float inside = 1.0 - smoothstep(edge - 0.04, edge + 0.04, r); // near-vertical wall
      h = mix(h, max(h, cragTop(c, q)), inside);
    }
    return h;
  }

  // Light from the front-left, mostly from behind the camera, so faces
  // turned toward the viewer glow green
  float lightAmount(vec3 n) {
    return clamp(dot(n, normalize(vec3(-0.35, 0.4, 0.85))), 0.0, 1.0);
  }

  void emit(vec3 pos) {
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vDepth = -mvPosition.z;
    gl_PointSize = clamp(14.0 / -mvPosition.z, 1.0, 3.2);
  }
`;

// Evenly scattered points over the whole landscape
const terrainVertexShader = common + /* glsl */ `
  attribute float aRand;

  void main() {
    vec2 xz = position.xz;
    float h = heightAt(xz);

    // Surface normal from finite differences
    float e = 0.06;
    float dx = (heightAt(xz + vec2(e, 0.0)) - heightAt(xz - vec2(e, 0.0))) / (2.0 * e);
    float dz = (heightAt(xz + vec2(0.0, e)) - heightAt(xz - vec2(0.0, e))) / (2.0 * e);
    vec3 n = normalize(vec3(-dx, 1.0, -dz));
    float slope = length(vec2(dx, dz));

    // Scanned points sit on the ground, so cliff faces would be nearly
    // empty. Drop each point a random distance down steep slopes to fill
    // the faces in, like a scanner hitting the rock wall.
    vec3 pos = vec3(xz.x, h - aRand * min(slope * 0.3, 2.8), xz.y);

    vLight = lightAmount(n);
    vHeight = h;
    vStrata = sin(pos.y * 26.0 + gnoise(xz * 1.5) * 4.0);
    vRand = aRand;
    vVisible = 1.0;
    emit(pos);
  }
`;

// Extra points packed onto the crags' walls and tops so they read as dense,
// solid rock. Their positions come entirely from aSeed:
//   x - where the point rides in the looping band (picks which crag)
//   y - angle around the crag
//   z - height up the wall / distance in from the edge on the top
//   w - wall or top
const cragVertexShader = common + /* glsl */ `
  attribute vec4 aSeed;

  // Crag points ride along with the terrain inside a looping band of world
  // z, from beyond the fog to just behind the camera. A point's spot in the
  // band picks its crag, so every crag in view keeps its full set of points;
  // once a crag passes the camera its points recycle onto a far-off one.
  const float BAND_END = 14.0;
  const float BAND_LENGTH = 30.0;
  const float WALL_SHARE = 0.78;

  void main() {
    float travel = uTime * TRAVEL;
    float bandZ = BAND_END - BAND_LENGTH + mod(aSeed.x * BAND_LENGTH + travel, BAND_LENGTH);
    Crag c = nearestCrag(bandZ - travel);

    vec2 q;
    float y;
    vec3 n;
    float visible = 1.0;
    float crack = 0.0;

    if (aSeed.w < WALL_SHARE) {
      // ---- wall: on the outline, anywhere from the ground up to the top.
      // Bunch points onto the side facing the canyon and the camera (the
      // big visible face) and thin them out round the back.
      float facing = atan(0.8, -c.side);
      float s = aSeed.y * 2.0 - 1.0;
      float theta = facing + 3.14159265 * s * (0.55 + 0.45 * s * s);
      vec2 dir = vec2(cos(theta), sin(theta));
      q = c.center + dir * cragOutline(c, theta);

      float base = baseHeight(q);
      float top = cragTop(c, q);
      visible = step(0.05, top - base); // ground as high as the crag here: no wall
      y = mix(base, top, aSeed.z);

      // Outward normal of the outline, roughened a little
      float e = 0.02;
      vec2 a = c.center + vec2(cos(theta - e), sin(theta - e)) * cragOutline(c, theta - e);
      vec2 b = c.center + vec2(cos(theta + e), sin(theta + e)) * cragOutline(c, theta + e);
      vec2 n2 = normalize(vec2(b.y - a.y, a.x - b.x));
      n = normalize(vec3(n2.x, gnoise(dir * 4.0 + y * 3.0) * 0.3, n2.y));

      // Dark vertical fissures, and scanner noise in front of / behind the face
      crack = 1.0 - smoothstep(0.0, 0.06, abs(gnoise(dir * 5.0 + c.seed * 3.1)));
      q += n2 * (fract(aSeed.z * 53.7 + aSeed.y * 17.3) - 0.5) * 0.06;
    } else {
      // ---- top: spread across the footprint
      float theta = aSeed.y * TAU;
      vec2 dir = vec2(cos(theta), sin(theta));
      q = c.center + dir * cragOutline(c, theta) * sqrt(aSeed.z);
      y = cragTop(c, q);
      visible = step(baseHeight(q), y);

      float e = 0.06;
      float dx = (cragTop(c, q + vec2(e, 0.0)) - cragTop(c, q - vec2(e, 0.0))) / (2.0 * e);
      float dz = (cragTop(c, q + vec2(0.0, e)) - cragTop(c, q - vec2(0.0, e))) / (2.0 * e);
      n = normalize(vec3(-dx, 1.0, -dz));
    }

    vLight = lightAmount(n);
    vHeight = y;
    vStrata = sin(y * 26.0 + gnoise(q * 1.5) * 4.0);
    vRand = fract(aSeed.y * 91.7 + aSeed.z * 13.3) * (1.0 - 0.7 * crack);
    vVisible = visible;
    emit(vec3(q.x, y, q.y + travel));
  }
`;

const fragmentShader = /* glsl */ `
  varying float vLight;
  varying float vHeight;
  varying float vStrata;
  varying float vDepth;
  varying float vRand;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) discard;
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float radialAlpha = smoothstep(0.5, 0.15, dist);

    // Palette sampled from the reference scan
    vec3 shadow = vec3(0.03, 0.12, 0.20);  // deep navy
    vec3 mid    = vec3(0.08, 0.42, 0.48);  // teal
    vec3 lit    = vec3(0.30, 1.00, 0.52);  // bright scan green

    float l = vLight;
    vec3 color = mix(shadow, mid, smoothstep(0.05, 0.45, l));
    color = mix(color, lit, smoothstep(0.45, 0.9, l));

    // Rock strata streaks and per-point speckle
    color *= 0.82 + 0.18 * vStrata;
    color *= 0.75 + 0.5 * vRand;

    // Low ground sinks into darkness, high ground holds its colour
    color *= mix(0.45, 1.0, smoothstep(0.0, 2.5, vHeight));

    // Distance fog so the far terrain dissolves into black
    float fogAlpha = smoothstep(24.0, 5.0, vDepth);

    gl_FragColor = vec4(color, radialAlpha * fogAlpha * 0.9);
  }
`;

const TERRAIN_POINTS = 200000;
const CRAG_POINTS = 140000;
// Terrain patch: wide across, and long down the canyon (camera sits at z ≈ 7.5
// looking toward -z, so most of the points go out in front of it).
const X_MIN = -10;
const X_MAX = 10;
const Z_MIN = -18;
const Z_MAX = 6;

function CanyonScan() {
  const groupRef = useRef();

  const { terrain, crags, uniforms } = useMemo(() => {
    // Randomly scattered points (no grid) so it reads as scan data
    const terrainPositions = new Float32Array(TERRAIN_POINTS * 3);
    const terrainRands = new Float32Array(TERRAIN_POINTS);
    for (let i = 0; i < TERRAIN_POINTS; i++) {
      terrainPositions[i * 3] = X_MIN + Math.random() * (X_MAX - X_MIN);
      terrainPositions[i * 3 + 2] = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
      terrainRands[i] = Math.random();
    }

    // Crag points are placed entirely in the shader from their seeds; the
    // empty position buffer is only there so three.js knows how many to draw.
    const cragPositions = new Float32Array(CRAG_POINTS * 3);
    const cragSeeds = new Float32Array(CRAG_POINTS * 4);
    for (let i = 0; i < cragSeeds.length; i++) cragSeeds[i] = Math.random();

    return {
      terrain: { positions: terrainPositions, rands: terrainRands },
      crags: { positions: cragPositions, seeds: cragSeeds },
      uniforms: { uTime: { value: 0 } },
    };
  }, []);

  useFrame(({ clock, pointer }) => {
    const elapsed = clock.getElapsedTime();
    uniforms.uTime.value = elapsed;

    if (groupRef.current) {
      // Gentle sway - small enough that the view stays pointed down the canyon
      groupRef.current.rotation.y = Math.sin(elapsed * 0.08) * 0.1 + pointer.x * 0.15;
      groupRef.current.rotation.x = 0.18 + Math.cos(elapsed * 0.06) * 0.04 + pointer.y * 0.08;
    }
  });

  // depthWrite lets nearer rock hide what's behind it, so the crags read as
  // solid faces instead of see-through clouds. frustumCulled is off because
  // the shaders move every point away from where three.js thinks it is.
  return (
    <group ref={groupRef} position={[0, -2.6, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[terrain.positions, 3]} />
          <bufferAttribute attach="attributes-aRand" args={[terrain.rands, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={terrainVertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite
        />
      </points>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[crags.positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[crags.seeds, 4]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={cragVertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite
        />
      </points>
    </group>
  );
}

export default function MoonTripBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        background: 'radial-gradient(circle at 50% 40%, #04090d 0%, #010203 100%)',
        pointerEvents: 'none',
      }}
    >
      <Canvas camera={{ position: [0, 1.6, 7.5], fov: 55 }} dpr={[1, 2]}>
        <CanyonScan />
      </Canvas>
    </div>
  );
}
