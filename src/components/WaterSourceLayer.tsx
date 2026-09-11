import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Water as ThreeWater } from 'three/addons/objects/Water.js';
import waterTextureSrc from '../assets/water.png';
import {
  getWaterBasinBySource,
  getWaterFillRatio,
  getWaterSurfaceY,
  isActiveWaterSource,
  type WaterBasin,
  type WaterSource,
} from '../types/waterSource';

type WaterSourceLayerProps = {
  waterBasins: WaterBasin[];
  waterSources: WaterSource[];
};

type WaterSurfaceProps = {
  waterBasin: WaterBasin;
  waterSource: WaterSource;
  waterNormals: THREE.Texture;
};

function WaterSurface({ waterBasin, waterSource, waterNormals }: WaterSurfaceProps) {
  const waterRef = useRef<ThreeWater | null>(null);
  const fillRatio = getWaterFillRatio(waterSource);
  const waterScale = 0.72 + Math.sqrt(fillRatio) * 0.28;
  const xRadius = waterBasin.size[0] / 2;
  const zRadius = waterBasin.size[1] / 2;
  const position = [
    waterBasin.position.x,
    getWaterSurfaceY(waterSource, waterBasin),
    waterBasin.position.z,
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

export default function WaterSourceLayer({ waterBasins, waterSources }: WaterSourceLayerProps) {
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
        .filter(isActiveWaterSource)
        .map((waterSource) => {
          const waterBasin = getWaterBasinBySource(waterSource, waterBasins);

          if (!waterBasin) {
            return null;
          }

          return (
            <WaterSurface
              key={waterSource.id}
              waterBasin={waterBasin}
              waterSource={waterSource}
              waterNormals={waterNormals}
            />
          );
        })}
    </group>
  );
}
