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

  // ---- terrain -------------------------------------------------------
  // World-space height at a ground position. Ridges + broad basins, then
  // terraced so the land breaks into flat shelves with steep cliff risers.
  float heightAt(vec2 xz) {
    vec2 p = xz * 0.32 + vec2(uTime * 0.03, uTime * 0.018);
    float h = ridged(p) * 1.1 + gnoise(p * 0.4) * 0.9;

    float steps = 4.0;
    float s = h * steps;
    float shelf = (floor(s) + pow(fract(s), 5.0)) / steps; // flat, then a sharp rise
    h = mix(h, shelf, 0.7);

    // fine rocky roughness
    h += gnoise(xz * 3.1) * 0.035 + gnoise(xz * 7.3) * 0.015;
    return h * 2.4;
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
    pos.y = h - aRand * min(slope * 0.35, 1.6);

    // Side light: lit faces turn bright green, the rest fall into shadow
    vec3 lightDir = normalize(vec3(-0.75, 0.45, 0.5));
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
    color *= mix(0.45, 1.0, smoothstep(-0.5, 2.0, vHeight));

    // Distance fog so the far terrain dissolves into black
    float fogAlpha = smoothstep(19.0, 4.0, vDepth);

    gl_FragColor = vec4(color, radialAlpha * fogAlpha * 0.9);
  }
`;

const POINT_COUNT = 160000;
const EXTENT = 18; // terrain spans [-9, 9] on x and z

function PointCloudScan() {
  const pointsRef = useRef();

  // Randomly scattered points (no grid) so it reads as scan data
  const { positions, rands, uniforms } = useMemo(() => {
    const posArray = new Float32Array(POINT_COUNT * 3);
    const randArray = new Float32Array(POINT_COUNT);
    for (let i = 0; i < POINT_COUNT; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * EXTENT;
      posArray[i * 3 + 1] = 0;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * EXTENT;
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
      // Slow, dreamy drift
      pointsRef.current.rotation.y = Math.sin(elapsed * 0.08) * 0.35 + pointer.x * 0.15;
      pointsRef.current.rotation.x = 0.25 + Math.cos(elapsed * 0.06) * 0.08 + pointer.y * 0.08;
    }
  });

  return (
    <points ref={pointsRef} position={[0, -2.2, 0]}>
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
      <Canvas camera={{ position: [0, 2.2, 7.5], fov: 55 }} dpr={[1, 2]}>
        <PointCloudScan />
      </Canvas>
    </div>
  );
}
