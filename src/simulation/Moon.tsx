import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldTime } from '../types/WorldTime';
import {
  getMoonPhase,
  getMoonPosition,
  getMoonVisibilityAmount,
} from './systems/sky';

const TEXTURE_SIZE = 256;
const MOON_SIZE = 10;
const PHASE_STEPS = 64;
const SKY_PLANE_DISTANCE = 130;

type MoonProps = {
  time: WorldTime;
};

const createMoonTexture = (phaseProgress: number): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const image = context.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const center = TEXTURE_SIZE / 2;
  const radius = TEXTURE_SIZE * 0.42;
  const phaseAngle = phaseProgress * Math.PI * 2;
  const lightX = Math.sin(phaseAngle);
  const lightZ = -Math.cos(phaseAngle);

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const unitX = (x - center) / radius;
      const unitY = (y - center) / radius;
      const distanceSq = unitX * unitX + unitY * unitY;
      const index = (y * TEXTURE_SIZE + x) * 4;

      if (distanceSq > 1) {
        continue;
      }

      const unitZ = Math.sqrt(1 - distanceSq);
      const lightAmount = Math.max(0, unitX * lightX + unitZ * lightZ);
      const edgeFade = Math.min(1, (1 - Math.sqrt(distanceSq)) * 18);
      const mottling =
        Math.sin(x * 0.18 + y * 0.07)
        * Math.sin(x * 0.031 - y * 0.12)
        * 8;
      const lit = 170 + lightAmount * 72 + mottling;
      const shadow = 28 + lightAmount * 22;
      const surfaceLight = Math.pow(lightAmount, 0.55);
      const red = shadow + (lit - shadow) * surfaceLight;
      const green = shadow + (lit * 0.96 - shadow) * surfaceLight;
      const blue = shadow + (lit * 0.84 - shadow) * surfaceLight;

      image.data[index] = red;
      image.data[index + 1] = green;
      image.data[index + 2] = blue;
      image.data[index + 3] = Math.round(255 * edgeFade);
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
};

export function Moon({ time }: MoonProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const phase = getMoonPhase(time);
  const phaseStep = Math.round(phase.progress * PHASE_STEPS) % PHASE_STEPS;
  const texture = useMemo(
    () => createMoonTexture(phaseStep / PHASE_STEPS),
    [phaseStep],
  );
  const celestialMoonPosition = new THREE.Vector3(...getMoonPosition(time));
  const moonDirection = celestialMoonPosition.normalize();
  const moonPosition: [number, number, number] = [
    45 + moonDirection.x * 22,
    52 + Math.max(0, moonDirection.y) * 28,
    -SKY_PLANE_DISTANCE,
  ];
  const opacity =
    getMoonVisibilityAmount(time) * (0.12 + phase.illumination * 0.88);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ camera }) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  if (opacity <= 0.02) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <sprite position={moonPosition} scale={[MOON_SIZE, MOON_SIZE, 1]} renderOrder={9}>
        <spriteMaterial
          map={texture}
          transparent
          opacity={opacity}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
