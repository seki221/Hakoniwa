import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldTime } from '../types/WorldTime';
import { getDaylightAmount } from './systems/sky';

const STAR_COUNT = 9000;
const STAR_RADIUS = 260;
const MIN_ELEVATION = 30;

type NightStarsProps = {
  time: WorldTime;
};

const createHemisphereStars = (): Float32Array => {
  const positions = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const y = MIN_ELEVATION + Math.random() * (1 - MIN_ELEVATION);
    const radiusAtY = Math.sqrt(1 - y * y);
    const radius = STAR_RADIUS * (0.85 + Math.random() * 0.15);
    const offset = i * 3;

    positions[offset] = Math.cos(theta) * radiusAtY * radius;
    positions[offset + 1] = y * radius;
    positions[offset + 2] = Math.sin(theta) * radiusAtY * radius;
  }

  return positions;
};

export function NightStars({ time }: NightStarsProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const geometry = useMemo(() => {
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(createHemisphereStars(), 3),
    );

    return starGeometry;
  }, []);
  const opacity = Math.max(0, Math.min(1, (0.32 - getDaylightAmount(time)) / 0.32));

  useFrame(({ camera }) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.position.copy(camera.position);
  });

  if (opacity <= 0.02) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <points geometry={geometry} frustumCulled={false} renderOrder={-1}>
        <pointsMaterial
          color="#ffffff"
          size={1.25}
          sizeAttenuation
          transparent
          opacity={opacity}
          depthTest={false}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
