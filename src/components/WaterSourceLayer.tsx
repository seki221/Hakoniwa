import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Water as ThreeWater } from 'three/addons/objects/Water.js';
import waterTextureSrc from '../assets/water.png';
import { getWaterSourceRadius } from '../simulation/systems/space';
import type { WaterSource } from '../types/waterSource';

type WaterSourceLayerProps = {
  waterSources: WaterSource[];
};

type WaterSurfaceProps = {
  waterSource: WaterSource;
  waterNormals: THREE.Texture;
};

const getWaterFillRatio = (waterSource: WaterSource): number => {
  if (waterSource.capacity <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, waterSource.amount / waterSource.capacity));
};

function WaterSurface({ waterSource, waterNormals }: WaterSurfaceProps) {
  const waterRef = useRef<ThreeWater | null>(null);
  const waterRadius = getWaterSourceRadius(waterSource);
  const fillRatio = getWaterFillRatio(waterSource);
  const waterScale = Math.sqrt(fillRatio);
  const geometry = useMemo(
    () => new THREE.CircleGeometry(waterRadius, 64),
    [waterRadius],
  );
  const water = useMemo(
    () =>
      new ThreeWater(geometry, {
        textureWidth: 256,
        textureHeight: 256,
        waterNormals,
        sunDirection: new THREE.Vector3(0.25, 1, 0.35).normalize(),
        sunColor: 0xffffff,
        waterColor: 0x4aa3c7,
        distortionScale: 1.8,
        alpha: 0.82,
        side: THREE.DoubleSide,
      }),
    [geometry, waterNormals],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      water.material.dispose();
    },
    [geometry, water],
  );

  useFrame((_, delta) => {
    if (!waterRef.current) {
      return;
    }

    waterRef.current.material.uniforms.time.value += delta * 0.45;
  });

  return (
    <primitive
      object={water}
      ref={waterRef}
      position={waterSource.position}
      rotation-x={-Math.PI / 2}
      scale={[waterScale, waterScale, 1]}
    />
  );
}

export default function WaterSourceLayer({ waterSources }: WaterSourceLayerProps) {
  const waterTexture = useTexture(waterTextureSrc);
  const waterNormals = useMemo(() => {
    const texture = waterTexture.clone();

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }, [waterTexture]);

  useEffect(() => () => waterNormals.dispose(), [waterNormals]);

  return (
    <group>
      {waterSources
        .filter((waterSource) => waterSource.state !== 'DRY' && waterSource.amount > 0)
        .map((waterSource) => (
          <WaterSurface
            key={waterSource.id}
            waterSource={waterSource}
            waterNormals={waterNormals}
          />
        ))}
    </group>
  );
}
