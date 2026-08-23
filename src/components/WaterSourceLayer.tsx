import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Water as ThreeWater } from 'three/addons/objects/Water.js';
import waterTextureSrc from '../assets/water.png';
import type { WaterSource } from '../types/waterSource';

type WaterSourceLayerProps = {
  waterSources: WaterSource[];
};

type WaterSurfaceProps = {
  waterSource: WaterSource;
  waterNormals: THREE.Texture;
};

type WaterBasinProps = {
  waterSource: WaterSource;
};

const getWaterFillRatio = (waterSource: WaterSource): number => {
  if (waterSource.capacity <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, waterSource.amount / waterSource.capacity));
};

const getWaterSurfaceY = (waterSource: WaterSource): number => {
  const fillRatio = getWaterFillRatio(waterSource);

  return waterSource.position.y - waterSource.depth * (1 - fillRatio) * 0.55;
};

function WaterBasin({ waterSource }: WaterBasinProps) {
  const bottomY = waterSource.position.y - waterSource.depth;
  const wallY = waterSource.position.y - waterSource.depth / 2;
  const xRadius = waterSource.size[0] / 2;
  const zRadius = waterSource.size[1] / 2;
  const basinColor = waterSource.terrainKind === 'MARSH' ? '#4a5533' : '#214954';
  const wallColor = waterSource.terrainKind === 'MARSH' ? '#667143' : '#566348';

  return (
    <group position={waterSource.position}>
      <mesh
        receiveShadow
        position={[0, bottomY - waterSource.position.y, 0]}
        rotation-x={-Math.PI / 2}
        scale={[xRadius, zRadius, 1]}
      >
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial color={basinColor} roughness={0.95} />
      </mesh>

      <mesh position={[0, wallY - waterSource.position.y, 0]} scale={[xRadius, 1, zRadius]}>
        <cylinderGeometry args={[1, 1, waterSource.depth, 64, 1, true]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.9}
          side={THREE.DoubleSide}
          transparent
          opacity={0.72}
        />
      </mesh>
    </group>
  );
}

function WaterSurface({ waterSource, waterNormals }: WaterSurfaceProps) {
  const waterRef = useRef<ThreeWater | null>(null);
  const fillRatio = getWaterFillRatio(waterSource);
  const waterScale = Math.sqrt(fillRatio);
  const xRadius = waterSource.size[0] / 2;
  const zRadius = waterSource.size[1] / 2;
  const position = [
    waterSource.position.x,
    getWaterSurfaceY(waterSource),
    waterSource.position.z,
  ] satisfies [number, number, number];
  const geometry = useMemo(
    () => new THREE.CircleGeometry(1, 64),
    [],
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
      position={position}
      rotation-x={-Math.PI / 2}
      scale={[xRadius * waterScale, zRadius * waterScale, 1]}
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
      {waterSources.map((waterSource) => (
        <WaterBasin key={`${waterSource.id}-basin`} waterSource={waterSource} />
      ))}
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
