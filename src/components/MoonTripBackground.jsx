import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// LiDAR-style rock scan: scattered points on cliff-and-plateau terrain,
// coloured by how much each surface faces the light (lit faces glow green,
// shadowed ones fall off to teal and navy).

const vertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aRand;
  varying float vLight;
  varying float vHeight;
  varying float vStrata;
  varying float vDepth;
  varying float vRand;

  // ---- noise ---------------------------------------------------------
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
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

  vec2 hash01(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
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

  // ---- terrain -------------------------------------------------------
  // A winding canyon down the middle (running away from the camera along z)
  // with near-vertical walls, and fractured rock slabs on either side.
  float heightAt(vec2 xz) {
    // Travel: the terrain slides toward the camera over time
    vec2 q = vec2(xz.x, xz.y - uTime * 0.25);

    // Canyon centreline meanders gently
    float center = sin(q.y * 0.18) * 1.0 + sin(q.y * 0.07 + 1.3) * 0.6;

    // Distance from the canyon, warped by noise so the rim zigzags
    float d = abs(xz.x - center) + gnoise(q * 0.9) * 0.6 + gnoise(q * 2.3) * 0.25;
    float halfWidth = 1.6 + gnoise(vec2(q.y * 0.15, 3.7)) * 0.6;

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

  void main() {
    vec3 pos = position;
    vec2 xz = pos.xz;

    float h = heightAt(xz);

    // Surface normal from finite differences
    float e = 0.06;
    float dx = (heightAt(xz + vec2(e, 0.0)) - heightAt(xz - vec2(e, 0.0))) / (2.0 * e);
    float dz = (heightAt(xz + vec2(0.0, e)) - heightAt(xz - vec2(0.0, e))) / (2.0 * e);
    vec3 normal = normalize(vec3(-dx, 1.0, -dz));
    float slope = length(vec2(dx, dz));

    // Scanned points sit on the ground, so vertical cliff faces would be
    // nearly empty. Drop each point a random distance down the slope to
    // fill the faces in, like a scanner hitting the rock wall.
    pos.y = h - aRand * min(slope * 0.3, 2.8);

    // Light from front-left: walls facing the camera or the canyon's left
    // side glow green, slab tops stay teal, the rest falls into shadow
    vec3 lightDir = normalize(vec3(-0.55, 0.35, 0.75));
    vLight = clamp(dot(normal, lightDir), 0.0, 1.0);

    vHeight = h;
    // horizontal rock layering, slightly wavy
    vStrata = sin(pos.y * 26.0 + gnoise(xz * 1.5) * 4.0);
    vRand = aRand;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vDepth = -mvPosition.z;

    gl_PointSize = clamp(14.0 / -mvPosition.z, 1.0, 3.2);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vLight;
  varying float vHeight;
  varying float vStrata;
  varying float vDepth;
  varying float vRand;

  void main() {
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

const POINT_COUNT = 200000;
// Terrain patch: wide across, and long down the canyon (camera sits at z ≈ 7.5
// looking toward -z, so most of the points go out in front of it).
const X_MIN = -10;
const X_MAX = 10;
const Z_MIN = -18;
const Z_MAX = 6;

function PointCloudScan() {
  const pointsRef = useRef();

  // Randomly scattered points (no grid) so it reads as scan data
  const { positions, rands, uniforms } = useMemo(() => {
    const posArray = new Float32Array(POINT_COUNT * 3);
    const randArray = new Float32Array(POINT_COUNT);
    for (let i = 0; i < POINT_COUNT; i++) {
      posArray[i * 3] = X_MIN + Math.random() * (X_MAX - X_MIN);
      posArray[i * 3 + 1] = 0;
      posArray[i * 3 + 2] = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
      randArray[i] = Math.random();
    }
    return {
      positions: posArray,
      rands: randArray,
      uniforms: { uTime: { value: 0 } },
    };
  }, []);

  useFrame(({ clock, pointer }) => {
    const elapsed = clock.getElapsedTime();
    uniforms.uTime.value = elapsed;

    if (pointsRef.current) {
      // Gentle sway - small enough that the view stays pointed down the canyon
      pointsRef.current.rotation.y = Math.sin(elapsed * 0.08) * 0.1 + pointer.x * 0.15;
      pointsRef.current.rotation.x = 0.18 + Math.cos(elapsed * 0.06) * 0.04 + pointer.y * 0.08;
    }
  });

  return (
    <points ref={pointsRef} position={[0, -2.6, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
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
        <PointCloudScan />
      </Canvas>
    </div>
  );
}
