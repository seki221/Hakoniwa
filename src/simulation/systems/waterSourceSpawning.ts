import * as THREE from 'three';
import type {
  WaterSource,
  WaterSourceState,
  WaterTerrainKind,
} from '../../types/waterSource';
import {
  FIELD_LIMIT,
  getWaterSourceRadius,
} from './space';
import { findSpawnPosition, type SpawnObstacle } from './spawning';

const WATER_SOURCE_Y = 0.02;
const MAX_ATTEMPTS = 100;
const SPRING_COUNT = 7;
const SPRING_FIELD_LIMIT = FIELD_LIMIT - 2;
const SPRING_MIN_SPACING = 3.2;
const SPRING_CAPACITY = 24;
const SPRING_MIN_SIZE = 1;
const SPRING_MAX_SIZE = 3;
const SPRING_SPAWN_CLEARANCE = 0.45;

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
  capacity: number,
  amount: number,
): WaterSource => ({
  id,
  name: id,
  position,
  size,
  terrainKind,
  depth: terrainKind === 'MARSH' ? 0.35 : 1.5,
  type: 'WATERSOURCE',
  capacity,
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
      100,
    ));

const chooseSpringTerrainKind = (): WaterTerrainKind =>
  Math.random() < 0.2 ? 'MARSH' : 'POND';

const chooseSpringSize = (): [number, number] => [
  SPRING_MIN_SIZE + Math.random() * (SPRING_MAX_SIZE - SPRING_MIN_SIZE),
  SPRING_MIN_SIZE + Math.random() * (SPRING_MAX_SIZE - SPRING_MIN_SIZE),
];

const getSpringCapacity = (size: [number, number]): number =>
  SPRING_CAPACITY * ((size[0] * size[1]) / (SPRING_MAX_SIZE * SPRING_MAX_SIZE));

const getSpringRadius = (size: [number, number]): number =>
  Math.max(...size) / 2;

const getWaterSourceSpawnObstacle = (
  waterSource: WaterSource,
  candidateSize: [number, number],
): SpawnObstacle => ({
  position: waterSource.position,
  minDistance:
    getWaterSourceRadius(waterSource)
    + getSpringRadius(candidateSize)
    + SPRING_SPAWN_CLEARANCE,
});

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
    const size = chooseSpringSize();
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
    const capacity = getSpringCapacity(size);
    const spring = createWaterSource(
      `watersource_spring_${i}`,
      spawnPosition,
      size,
      terrainKind,
      state,
      capacity,
      state === 'CLEAN' ? capacity : capacity * 0.5,
    );

    springs.push(spring);
    occupiedAreas.push({
      position: spawnPosition,
      minDistance: Math.max(SPRING_MIN_SPACING, getSpringRadius(size) * 2 + SPRING_SPAWN_CLEARANCE),
    });
  }

  return springs;
};

export const createInitialWaterSources = (): WaterSource[] => {
  const fixedWaterSources = createFixedWaterSources();
  const occupiedAreas: SpawnObstacle[] = fixedWaterSources.map((waterSource) =>
    getWaterSourceSpawnObstacle(waterSource, [SPRING_MAX_SIZE, SPRING_MAX_SIZE]));
  const springWaterSources = createSpringWaterSources(occupiedAreas);

  return [
    ...fixedWaterSources,
    ...springWaterSources,
  ];
};
