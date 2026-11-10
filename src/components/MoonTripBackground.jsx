import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vElevation;
  varying float vDepth;

  // Classic 3D simplex-style organic wave displacement
  float terrainNoise(vec2 p) {
    float n = sin(p.x * 1.2 + uTime * 0.18) * cos(p.y * 1.2 - uTime * 0.14);
    n += 0.5 * sin(p.x * 2.7 - uTime * 0.22 + p.y * 1.9);
    n += 0.25 * cos(p.x * 5.3 + p.y * 4.7 + uTime * 0.3);
    return n;
  }

  void main() {
    vec3 pos = position;

    // Displace Y to mimic photogrammetry ridges, valleys, and organic structures
    float elevation = terrainNoise(pos.xz * 0.45);
    pos.y += elevation * 1.65;

    // Subtle horizontal drift like unanchored scan data
    pos.x += sin(pos.z * 0.6 + uTime * 0.2) * 0.18;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vElevation = elevation;
    vDepth = -mvPosition.z;

    // Perspective point sizing (closer points appear slightly larger)
    gl_PointSize = clamp((18.0 / -mvPosition.z), 1.0, 4.5);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vElevation;
  varying float vDepth;

  void main() {
    // Soft circular point falloff instead of harsh squares
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float radialAlpha = smoothstep(0.5, 0.1, dist);

    // Iridescent / ghostly photogrammetry palette (deep indigo -> pale cyan -> lunar white)
    vec3 lowColor = vec3(0.18, 0.22, 0.48);   // Deep twilight violet-blue
    vec3 midColor = vec3(0.45, 0.78, 0.88);   // Ghostly cyan-silver
    vec3 highColor = vec3(0.92, 0.90, 0.98);  // Pale lunar highlight

    float h = clamp((vElevation + 1.4) / 2.8, 0.0, 1.0);
    vec3 color = mix(lowColor, midColor, smoothstep(0.0, 0.6, h));
    color = mix(color, highColor, smoothstep(0.6, 1.0, h));

    // Distance fog fade so the horizon dissolves into darkness
    float fogAlpha = smoothstep(18.0, 4.5, vDepth);

    gl_FragColor = vec4(color, radialAlpha * fogAlpha * 0.85);
  }
`;

function PointCloudScan() {
  const pointsRef = useRef();

  // Create a dense 220 x 220 grid of scan points (~48,400 particles)
  const { positions, uniforms } = useMemo(() => {
    const countX = 220;
    const countZ = 220;
    const total = countX * countZ;
    const posArray = new Float32Array(total * 3);

    let i = 0;
    for (let ix = 0; ix < countX; ix++) {
      for (let iz = 0; iz < countZ; iz++) {
        // Normalize to [-9, 9] and add slight jitter so it feels scanned rather than rigid
        const jitterX = (Math.random() - 0.5) * 0.08;
        const jitterZ = (Math.random() - 0.5) * 0.08;

        posArray[i * 3] = (ix / countX - 0.5) * 18 + jitterX;
        posArray[i * 3 + 1] = 0;
        posArray[i * 3 + 2] = (iz / countZ - 0.5) * 18 + jitterZ;
        i++;
      }
    }

    return {
      positions: posArray,
      uniforms: {
        uTime: { value: 0 },
      },
    };
  }, []);

  useFrame(({ clock, pointer }) => {
    const elapsed = clock.getElapsedTime();
    uniforms.uTime.value = elapsed;

    if (pointsRef.current) {
      // Slow, dreamy camera/mesh drift
      pointsRef.current.rotation.y = Math.sin(elapsed * 0.08) * 0.35 + pointer.x * 0.15;
      pointsRef.current.rotation.x = 0.25 + Math.cos(elapsed * 0.06) * 0.08 + pointer.y * 0.08;
    }
  });

  return (
    <points ref={pointsRef} position={[0, -1.2, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
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
        background: 'radial-gradient(circle at 50% 40%, #0d101d 0%, #040508 100%)',
        pointerEvents: 'none',
      }}
    >
      <Canvas camera={{ position: [0, 2.2, 7.5], fov: 55 }} dpr={[1, 2]}>
        <PointCloudScan />
      </Canvas>
    </div>
  );
}
