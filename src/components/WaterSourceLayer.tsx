import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Water as ThreeWater } from 'three/addons/objects/Water.js';
import waterTextureSrc from '../assets/water.png';
import {
  clamp,
  WATER_DEPRESSION_FLAT_RADIUS,
  WATER_EDGE_DEPTH,
} from '../simulation/systems/environment';
import {
  getWaterBasinBySource,
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

const WATER_SURFACE_INSET = 0.985;
const WATER_VOLUME_SEGMENTS = 96;
const WATER_VOLUME_SURFACE_OFFSET = 0.012;
const WATER_VOLUME_BOTTOM_OFFSET = 0.018;

const invertSmoothstep = (value: number): number => {
  let low = 0;
  let high = 1;

  for (let i = 0; i < 12; i += 1) {
    const middle = (low + high) / 2;
    const smoothed = middle * middle * (3 - 2 * middle);

    if (smoothed < value) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
};

const getWaterRadiusRatio = (
  waterBasin: WaterBasin,
  waterSource: WaterSource,
): number => {
  const surfaceY = getWaterSurfaceY(waterSource, waterBasin);
  const bottomY = waterBasin.position.y - waterBasin.depth;
  const edgeY = waterBasin.position.y - WATER_EDGE_DEPTH;

  if (surfaceY >= edgeY) {
    return WATER_SURFACE_INSET;
  }

  if (surfaceY <= bottomY) {
    return WATER_DEPRESSION_FLAT_RADIUS * WATER_SURFACE_INSET;
  }

  const heightRatio = clamp((surfaceY - bottomY) / (edgeY - bottomY), 0, 1);
  const slopeRatio = invertSmoothstep(heightRatio);

  return (
    WATER_DEPRESSION_FLAT_RADIUS
    + (1 - WATER_DEPRESSION_FLAT_RADIUS) * slopeRatio
  ) * WATER_SURFACE_INSET;
};

const createWaterVolumeGeometry = (
  xRadius: number,
  zRadius: number,
  topRadiusRatio: number,
  bottomRadiusRatio: number,
  depth: number,
): THREE.BufferGeometry => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const topRadiusX = xRadius * topRadiusRatio;
  const topRadiusZ = zRadius * topRadiusRatio;
  const bottomRadiusX = xRadius * bottomRadiusRatio;
  const bottomRadiusZ = zRadius * bottomRadiusRatio;
  const bottomY = -depth;

  for (let i = 0; i <= WATER_VOLUME_SEGMENTS; i += 1) {
    const angle = (i / WATER_VOLUME_SEGMENTS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const normal = new THREE.Vector3(cos / xRadius, 0.18, sin / zRadius).normalize();

    positions.push(topRadiusX * cos, 0, topRadiusZ * sin);
    positions.push(bottomRadiusX * cos, bottomY, bottomRadiusZ * sin);
    normals.push(normal.x, normal.y, normal.z);
    normals.push(normal.x, normal.y, normal.z);
  }

  for (let i = 0; i < WATER_VOLUME_SEGMENTS; i += 1) {
    const topA = i * 2;
    const bottomA = topA + 1;
    const topB = topA + 2;
    const bottomB = topA + 3;

    indices.push(topA, bottomA, topB);
    indices.push(topB, bottomA, bottomB);
  }

  const bottomCenterIndex = positions.length / 3;
  positions.push(0, bottomY, 0);
  normals.push(0, -1, 0);

  for (let i = 0; i <= WATER_VOLUME_SEGMENTS; i += 1) {
    const angle = (i / WATER_VOLUME_SEGMENTS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    positions.push(bottomRadiusX * cos, bottomY, bottomRadiusZ * sin);
    normals.push(0, -1, 0);
  }

  const bottomRingStart = bottomCenterIndex + 1;

  for (let i = 0; i < WATER_VOLUME_SEGMENTS; i += 1) {
    indices.push(bottomCenterIndex, bottomRingStart + i + 1, bottomRingStart + i);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
};

function WaterSurface({ waterBasin, waterSource, waterNormals }: WaterSurfaceProps) {
  const waterRef = useRef<ThreeWater | null>(null);
  const xRadius = waterBasin.size[0] / 2;
  const zRadius = waterBasin.size[1] / 2;
  const surfaceY = getWaterSurfaceY(waterSource, waterBasin);
  const bottomY = waterBasin.position.y - waterBasin.depth;
  const volumeDepth = Math.max(
    WATER_VOLUME_BOTTOM_OFFSET,
    surfaceY - bottomY - WATER_VOLUME_BOTTOM_OFFSET,
  );
  const waterRadiusRatio = getWaterRadiusRatio(waterBasin, waterSource);
  const bottomRadiusRatio = Math.min(
    WATER_DEPRESSION_FLAT_RADIUS,
    waterRadiusRatio,
  ) * 0.96;
  const position = [
    waterBasin.position.x,
    surfaceY,
    waterBasin.position.z,
  ] satisfies [number, number, number];
  const volumeGeometry = useMemo(
    () => createWaterVolumeGeometry(
      xRadius,
      zRadius,
      waterRadiusRatio,
      bottomRadiusRatio,
      volumeDepth,
    ),
    [bottomRadiusRatio, volumeDepth, waterRadiusRatio, xRadius, zRadius],
  );
  const volumeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#79c8e3',
      transparent: true,
      opacity: 0.38,
      roughness: 0.42,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    [],
  );
  const geometry = useMemo(
    () => new THREE.CircleGeometry(1, WATER_VOLUME_SEGMENTS),
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
        side: THREE.FrontSide,
      }),
    [geometry, waterNormals],
  );

  useEffect(() => () => volumeGeometry.dispose(), [volumeGeometry]);

  useEffect(
    () => () => {
      geometry.dispose();
      volumeMaterial.dispose();
      water.material.dispose();
    },
    [geometry, volumeMaterial, water],
  );

  useFrame((_, delta) => {
    if (!waterRef.current) {
      return;
    }

    waterRef.current.material.uniforms.time.value += delta * 0.45;
  });

  return (
    <group>
      <mesh
        geometry={volumeGeometry}
        material={volumeMaterial}
        position={[
          waterBasin.position.x,
          surfaceY - WATER_VOLUME_SURFACE_OFFSET,
          waterBasin.position.z,
        ]}
        renderOrder={1}
      />
      <primitive
        object={water}
        ref={waterRef}
        position={position}
        rotation-x={-Math.PI / 2}
        scale={[xRadius * waterRadiusRatio, zRadius * waterRadiusRatio, 1]}
        renderOrder={2}
      />
    </group>
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
