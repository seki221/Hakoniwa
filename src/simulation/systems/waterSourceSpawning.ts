import * as THREE from 'three';
import type {
  WaterSource,
  WaterSourceState,
  WaterTerrainKind,
} from '../../types/waterSource';
import {
  FIELD_LIMIT,
  getWaterSourceInteractionDistance,
} from './space';
import { findSpawnPosition, type SpawnObstacle } from './spawning';

const WATER_SOURCE_Y = 0.02;
const MAX_ATTEMPTS = 100;
const SPRING_COUNT = 7;
const SPRING_FIELD_LIMIT = FIELD_LIMIT - 2;
const SPRING_MIN_SPACING = 3.2;
const SPRING_SIZE: [number, number] = [1.4, 1.4];

const FIXED_WATER_SOURCE_LAYOUT = [
  { id: 'watersource_lake_0', x: -5, z: -5, size: [20, 20] },
] satisfies Array<{
  id: string;
  x: number;
  z: number;
  size: [number, number];
}>;

const createWaterSource = (
  id: string,
  position: THREE.Vector3,
  size: [number, number],
  terrainKind: WaterTerrainKind,
  state: WaterSourceState,
  amount: number,
): WaterSource => ({
  id,
  name: id,
  position,
  size,
  terrainKind,
  depth: terrainKind === 'MARSH' ? 0.35 : 1.5,
  type: 'WATERSOURCE',
  amount,
  state,
});

const createFixedWaterSources = (): WaterSource[] =>
  FIXED_WATER_SOURCE_LAYOUT.map((waterSource) =>
    createWaterSource(
      waterSource.id,
      new THREE.Vector3(waterSource.x, WATER_SOURCE_Y, waterSource.z),
      waterSource.size,
      'POND',
      'CLEAN',
      100,
    ));

const chooseSpringTerrainKind = (): WaterTerrainKind =>
  Math.random() < 0.2 ? 'MARSH' : 'POND';

const chooseSpringState = (terrainKind: WaterTerrainKind): WaterSourceState => {
  if (terrainKind === 'MARSH') {
    return 'CLEAN';
  }

  return Math.random() < 0.18 ? 'POLLUTED' : 'CLEAN';
};

const createSpringWaterSources = (
  occupiedAreas: SpawnObstacle[],
): WaterSource[] => {
  const springs: WaterSource[] = [];

  for (let i = 0; i < SPRING_COUNT; i++) {
    const spawnPosition = findSpawnPosition(occupiedAreas, {
      fieldLimit: SPRING_FIELD_LIMIT,
      maxAttempts: MAX_ATTEMPTS,
      y: WATER_SOURCE_Y,
    });

    if (!spawnPosition) {
      continue;
    }

    const terrainKind = chooseSpringTerrainKind();
    const state = chooseSpringState(terrainKind);
    const spring = createWaterSource(
      `watersource_spring_${i}`,
      spawnPosition,
      SPRING_SIZE,
      terrainKind,
      state,
      state === 'CLEAN' ? 24 : 12,
    );

    springs.push(spring);
    occupiedAreas.push({
      position: spawnPosition,
      minDistance: SPRING_MIN_SPACING,
    });
  }

  return springs;
};

export const createInitialWaterSources = (): WaterSource[] => {
  const fixedWaterSources = createFixedWaterSources();
  const occupiedAreas: SpawnObstacle[] = fixedWaterSources.map((waterSource) => ({
    position: waterSource.position.clone(),
    minDistance: getWaterSourceInteractionDistance(waterSource),
  }));
  const springWaterSources = createSpringWaterSources(occupiedAreas);

  return [
    ...fixedWaterSources,
    ...springWaterSources,
  ];
};
