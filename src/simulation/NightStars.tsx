import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldTime } from '../types/WorldTime';
import { getDaylightAmount } from './systems/sky';

const STAR_COUNT = 2600;
const STAR_RADIUS = 260;
const MIN_ELEVATION = 0.12;

const STAR_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 starColor;
  attribute float twinkle;
  uniform float time;
  varying vec3 vColor;

  void main() {
    vColor = starColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float flicker = 0.88 + 0.12 * sin(time * 0.7 + twinkle);
    gl_PointSize = size * flicker;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = `
  uniform float opacity;
  varying vec3 vColor;

  void main() {
    float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
    float alpha = smoothstep(0.5, 0.08, distanceFromCenter);

    if (alpha <= 0.01) {
      discard;
    }

    gl_FragColor = vec4(vColor, alpha * opacity);
  }
`;

type NightStarsProps = {
  time: WorldTime;
};

const createHemisphereStars = () => {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const colors = new Float32Array(STAR_COUNT * 3);
  const twinkles = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const y = MIN_ELEVATION + Math.random() * (1 - MIN_ELEVATION);
    const radiusAtY = Math.sqrt(1 - y * y);
    const radius = STAR_RADIUS * (0.85 + Math.random() * 0.15);
    const offset = i * 3;
    const brightnessRoll = Math.random();
    const colorWarmth = Math.random();

    positions[offset] = Math.cos(theta) * radiusAtY * radius;
    positions[offset + 1] = y * radius;
    positions[offset + 2] = Math.sin(theta) * radiusAtY * radius;

    sizes[i] = brightnessRoll > 0.985
      ? 3.1 + Math.random() * 1.8
      : brightnessRoll > 0.93
        ? 1.8 + Math.random() * 0.9
        : 0.75 + Math.random() * 0.95;

    colors[offset] = colorWarmth > 0.86 ? 1 : 0.84 + Math.random() * 0.12;
    colors[offset + 1] = 0.86 + Math.random() * 0.12;
    colors[offset + 2] = colorWarmth < 0.18 ? 1 : 0.9 + Math.random() * 0.1;
    twinkles[i] = Math.random() * Math.PI * 2;
  }

  return {
    positions,
    sizes,
    colors,
    twinkles,
  };
};

export function NightStars({ time }: NightStarsProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(() => {
    const stars = createHemisphereStars();
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(stars.positions, 3),
    );
    starGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(stars.sizes, 1),
    );
    starGeometry.setAttribute(
      'starColor',
      new THREE.BufferAttribute(stars.colors, 3),
    );
    starGeometry.setAttribute(
      'twinkle',
      new THREE.BufferAttribute(stars.twinkles, 1),
    );

    return starGeometry;
  }, []);
  const opacity = Math.max(0, Math.min(1, (0.32 - getDaylightAmount(time)) / 0.32));

  useFrame(({ camera, clock }) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.position.copy(camera.position);

    if (materialRef.current) {
      materialRef.current.uniforms.opacity.value = opacity;
      materialRef.current.uniforms.time.value = clock.elapsedTime;
    }
  });

  if (opacity <= 0.02) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <points geometry={geometry} frustumCulled={false} renderOrder={8}>
        <shaderMaterial
          ref={materialRef}
          uniforms={{
            opacity: { value: opacity },
            time: { value: 0 },
          }}
          vertexShader={STAR_VERTEX_SHADER}
          fragmentShader={STAR_FRAGMENT_SHADER}
          transparent
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
