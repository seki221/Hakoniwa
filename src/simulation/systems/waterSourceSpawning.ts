import * as THREE from 'three';
import type { WaterSource } from '../../types/waterSource';

const WATER_SOURCE_Y = 0.02;
const WATER_SOURCE_X = 20;
const WATER_SOURCE_Z = 20;
const INITIAL_WATER_SOURCE_LAYOUT = [
  // { id: 'watersource_0', x: 5, z: 5, size: [2, 2] },
  { id: 'watersource_1', x: -5, z: -5, size: [WATER_SOURCE_X, WATER_SOURCE_Z] },
] satisfies Array<{
  id: string;
  x: number;
  z: number;
  size: [number, number];
}>;

export const createInitialWaterSources = (): WaterSource[] =>
  INITIAL_WATER_SOURCE_LAYOUT.map((waterSource) => ({
    id: waterSource.id,
    name: waterSource.id,
    position: new THREE.Vector3(waterSource.x, WATER_SOURCE_Y, waterSource.z),
    size: waterSource.size,
    terrainKind: 'POND',
    depth: 1.5,
    type: 'WATERSOURCE',
    amount: 100,
    state: 'CLEAN',
  }));
