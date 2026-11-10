import { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

// LiDAR-style canyon scan: scattered points over a winding canyon with
// fractured rock slabs on either side and tall faceted crags jutting up from
// the rim. Points are coloured by how much their surface faces the light:
// lit faces glow green, the rest fall off to teal and navy. The camera
// follows the canyon, cruising above the rim and now and then dropping down
// to fly between the walls.

// How fast the landscape flows toward the camera (units per second). Shared
// with the shaders so the camera can keep tracking the canyon as it moves.
const TRAVEL = 0.25;

// Shared by all three vertex shaders (terrain, crags, canyon walls)
const common = /* glsl */ `
  uniform float uTime;

  const float TAU = 6.2831853;
  const float TRAVEL = ${TRAVEL.toFixed(4)};
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

  // (mirrored in JS below so the camera can follow it)
  float canyonCenter(float z) {
    return sin(z * 0.18) * 1.0 + sin(z * 0.07 + 1.3) * 0.6;
  }

  float canyonHalfWidth(float z) {
    return 1.6 + gnoise(vec2(z * 0.15, 3.7)) * 0.6;
  }

  // Distance from the canyon's centreline, warped by noise so the rim zigzags
  float canyonDistance(vec2 q) {
    return abs(q.x - canyonCenter(q.y)) + gnoise(q * 0.9) * 0.6 + gnoise(q * 2.3) * 0.25;
  }

  // Valley floor: low, with rubbly ridges
  float floorHeight(vec2 q) {
    return ridged(q * 0.6) * 0.35 + gnoise(q * 3.0) * 0.05;
  }

  // Rim: each Voronoi cell is its own tilted rock slab at its own height,
  // so neighbouring slabs meet in sharp fractured drops.
  float rimHeight(vec2 q, float d, float halfWidth) {
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
    return slab;
  }

  // Ground height without the crags
  float baseHeight(vec2 q) {
    float d = canyonDistance(q);
    float halfWidth = canyonHalfWidth(q.y);
    // 0 on the canyon floor, 1 up on the rim - a very steep step = cliff wall
    float wall = smoothstep(halfWidth, halfWidth + 0.3, d);
    return mix(floorHeight(q), rimHeight(q, d, halfWidth), wall);
  }

  // ---- crags ---------------------------------------------------------
  // Tall faceted rock towers spaced along the canyon, alternating sides,
  // standing at the rim so their inner face can drop toward the floor.
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
    // set back enough that the camera's path down the canyon stays clear
    c.center = vec2(canyonCenter(z) + c.side * (canyonHalfWidth(z) + c.radius), z);
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
    float r = 0.7 + 0.6 * mix(r0, r1, a - i);                              // straight-ish facets
    r += gnoise(vec2(cos(theta), sin(theta)) * 3.0 + c.seed * 7.7) * 0.08; // chips
    return c.radius * r;
  }

  bool insideCrag(Crag c, vec2 q) {
    vec2 v = q - c.center;
    return length(v) < cragOutline(c, atan(v.y, v.x));
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
    gl_PointSize = clamp(16.0 / -mvPosition.z, 1.0, 4.0);
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

// Dense points on the canyon's side walls, so they still read as solid rock
// when the camera drops down inside the canyon. Like the terrain points they
// stay at a fixed world z while the landscape slides past them.
//   aSeed.x - which side of the canyon
//   aSeed.y - height up the wall
//   aSeed.z - speckle
//   aSeed.w - scatter in front of / behind the face
const wallVertexShader = common + /* glsl */ `
  attribute vec4 aSeed;

  void main() {
    float travel = uTime * TRAVEL;
    float z = position.z;
    float qz = z - travel;
    float side = aSeed.x < 0.5 ? -1.0 : 1.0;
    float halfWidth = canyonHalfWidth(qz);
    float wallD = halfWidth + 0.15; // middle of the wall's steep band

    // Find where the noise-warped wall actually is at this depth by solving
    // canyonDistance(x) = wallD with a few Newton steps
    float x = canyonCenter(qz) + side * wallD;
    for (int i = 0; i < 4; i++) {
      float f = canyonDistance(vec2(x, qz)) - wallD;
      float df = (canyonDistance(vec2(x + 0.01, qz)) - canyonDistance(vec2(x - 0.01, qz))) / 0.02;
      df = abs(df) < 0.2 ? side * 0.2 : df;
      x -= clamp(f / df, -0.4, 0.4);
    }
    vec2 q = vec2(x, qz);
    float d = canyonDistance(q);

    // Hide points where the solve missed (the wall folds back on itself)
    // or where a crag stands in front of the wall
    float visible = step(abs(d - wallD), 0.08);
    if (insideCrag(nearestCrag(qz), q)) visible = 0.0;

    // Spread up the wall, from the canyon floor to the rim
    float y = mix(floorHeight(q), rimHeight(q, d, halfWidth), aSeed.y);

    // The wall faces into the canyon: opposite to the way distance grows
    float e = 0.03;
    vec2 grad = vec2(
      canyonDistance(q + vec2(e, 0.0)) - canyonDistance(q - vec2(e, 0.0)),
      canyonDistance(q + vec2(0.0, e)) - canyonDistance(q - vec2(0.0, e))
    );
    vec2 n2 = -normalize(grad);
    vec3 n = normalize(vec3(n2.x, 0.15 + gnoise(q * 4.0 + y * 3.0) * 0.3, n2.y));

    vec2 scatter = n2 * (aSeed.w - 0.5) * 0.08;

    vLight = lightAmount(n);
    vHeight = y;
    vStrata = sin(y * 26.0 + gnoise(q * 1.5) * 4.0);
    vRand = aSeed.z;
    vVisible = visible;
    emit(vec3(x + scatter.x, y, z + scatter.y));
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

// Point budgets (desktop; phones get a fraction - see CanyonScan)
const TERRAIN_POINTS = 200000;
const CRAG_POINTS = 140000;
const WALL_POINTS = 60000;

// Terrain patch: wide across, and long down the canyon in front of the camera
const X_MIN = -10;
const X_MAX = 10;
const Z_MIN = -18;
const Z_MAX = 6;

// ---- camera flight ---------------------------------------------------------
const CAMERA_Z = 5;
const LOOK_AHEAD = 7;       // how far down the canyon the camera aims
const CRUISE_HEIGHT = 4.1;  // just above the rim (rim ~2.3-3.5, crag tops ~4.3-5.4)
const CANYON_HEIGHT = 1.1;  // down between the walls, above the floor (~0-0.45)
const DIVE_PERIOD = 70;     // seconds per cruise -> dive into the canyon -> climb out

// Mirrors canyonCenter() in the shader
const canyonCenter = (z) => Math.sin(z * 0.18) + Math.sin(z * 0.07 + 1.3) * 0.6;
// Its second derivative: how sharply the canyon is bending (for banking)
const canyonBend = (z) => -0.0324 * Math.sin(z * 0.18) - 0.00294 * Math.sin(z * 0.07 + 1.3);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const randoms = (n) => Float32Array.from({ length: n }, () => Math.random());

function ScanPoints({ vertexShader, attributes, uniforms }) {
  // depthWrite lets nearer rock hide what's behind it, so surfaces read as
  // solid. frustumCulled is off because the shaders move every point away
  // from where three.js thinks it is.
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        {Object.entries(attributes).map(([name, [array, size]]) => (
          <bufferAttribute key={name} attach={`attributes-${name}`} args={[array, size]} />
        ))}
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite
      />
    </points>
  );
}

function CanyonScan() {
  const { terrain, crags, walls, uniforms } = useMemo(() => {
    // Phones get fewer points: these shaders are heavy and run every frame
    const density = window.innerWidth < 768 ? 0.45 : 1;
    const terrainCount = Math.round(TERRAIN_POINTS * density);
    const cragCount = Math.round(CRAG_POINTS * density);
    const wallCount = Math.round(WALL_POINTS * density);

    // Randomly scattered ground points (no grid) so it reads as scan data
    const terrainPositions = new Float32Array(terrainCount * 3);
    for (let i = 0; i < terrainCount; i++) {
      terrainPositions[i * 3] = X_MIN + Math.random() * (X_MAX - X_MIN);
      terrainPositions[i * 3 + 2] = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
    }

    // Wall points only need a world z; the shader finds the wall at that depth
    const wallPositions = new Float32Array(wallCount * 3);
    for (let i = 0; i < wallCount; i++) {
      wallPositions[i * 3 + 2] = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
    }

    // Crag points are placed entirely in the shader from their seeds; the
    // empty position buffer is only there so three.js knows how many to draw.
    return {
      terrain: { position: [terrainPositions, 3], aRand: [randoms(terrainCount), 1] },
      crags: { position: [new Float32Array(cragCount * 3), 3], aSeed: [randoms(cragCount * 4), 4] },
      walls: { position: [wallPositions, 3], aSeed: [randoms(wallCount * 4), 4] },
      uniforms: { uTime: { value: 0 } },
    };
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    const travel = t * TRAVEL;

    // 0 while cruising above the rim, 1 while flying down inside the canyon
    const cycle = 0.5 - 0.5 * Math.cos((t / DIVE_PERIOD) * Math.PI * 2);
    const dive = smoothstep(0.35, 0.85, cycle);

    // Follow the canyon's centreline, drifting side to side (less so between
    // the walls), easing forward and back, and bobbing gently
    const z = CAMERA_Z + Math.sin(t * 0.11) * 0.6;
    const q = z - travel; // where along the canyon the camera currently is
    const drift = (Math.sin(t * 0.23) * 0.25 + Math.sin(t * 0.37 + 1.7) * 0.1) * (1 - dive * 0.4);
    const y = lerp(CRUISE_HEIGHT, CANYON_HEIGHT, dive) + Math.sin(t * 0.31) * 0.15;
    camera.position.set(canyonCenter(q) + drift, y, z);

    // Aim down the canyon ahead: tilted down over the rim, nearly level inside
    const tz = z - LOOK_AHEAD;
    camera.lookAt(
      canyonCenter(tz - travel) + Math.sin(t * 0.17) * 0.4,
      lerp(1.6, 0.9, dive) + Math.sin(t * 0.13) * 0.2,
      tz
    );

    // Bank into the bends, plus a slight lazy roll
    camera.rotateZ(-canyonBend(q - 3) * 2.5 + Math.sin(t * 0.19) * 0.02);
  });

  return (
    <>
      <ScanPoints vertexShader={terrainVertexShader} attributes={terrain} uniforms={uniforms} />
      <ScanPoints vertexShader={wallVertexShader} attributes={walls} uniforms={uniforms} />
      <ScanPoints vertexShader={cragVertexShader} attributes={crags} uniforms={uniforms} />
    </>
  );
}

export default function MoonTripBackground() {
  // Reduced motion: draw a single still frame instead of animating
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        background: 'radial-gradient(circle at 50% 40%, #04090d 0%, #010203 100%)',
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, CRUISE_HEIGHT, CAMERA_Z], fov: 58, near: 0.05, far: 60 }}
        dpr={[1, 2]}
        frameloop={reduceMotion ? 'demand' : 'always'}
      >
        <CanyonScan />
      </Canvas>
    </div>
  );
}
