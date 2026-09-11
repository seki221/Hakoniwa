import * as THREE from 'three';
import type {
  WaterBasin,
  WaterSource,
  WaterSourceState,
  WaterTerrainKind,
} from '../../types/waterSource';
import { FIELD_LIMIT } from './space';
import { findSpawnPosition, type SpawnObstacle } from './spawning';

const WATER_BASIN_Y = 0.02;
const MAX_ATTEMPTS = 100;
const SPRING_COUNT = 7;
const SPRING_FIELD_LIMIT = FIELD_LIMIT - 2;
const SPRING_MIN_SPACING = 3.2;
const SPRING_CAPACITY = 24;
const SPRING_MIN_SIZE = 1;
const SPRING_MAX_SIZE = 3;
const SPRING_SPAWN_CLEARANCE = 0.45;
const DEFAULT_FILL_RATIO = 0.85;
const POLLUTED_FILL_RATIO = 0.45;

const FIXED_WATER_BASIN_LAYOUT = [
  { id: 'waterbasin_lake_0', sourceId: 'watersource_lake_0', x: -5, z: -5, size: [20, 20] },
] satisfies Array<{
  id: string;
  sourceId: string;
  x: number;
  z: number;
  size: [number, number];
}>;

type WaterBody = {
  basin: WaterBasin;
  source: WaterSource;
};

export type InitialWaterBodies = {
  waterBasins: WaterBasin[];
  waterSources: WaterSource[];
};

const getBasinDepth = (terrainKind: WaterTerrainKind): number =>
  terrainKind === 'MARSH' ? 0.35 : 1.5;

const getBasinRadius = (basin: Pick<WaterBasin, 'size'>): number =>
  Math.max(...basin.size) / 2;

const createWaterBody = (
  basinId: string,
  sourceId: string,
  position: THREE.Vector3,
  size: [number, number],
  terrainKind: WaterTerrainKind,
  state: WaterSourceState,
  capacity: number,
  fillRatio: number,
): WaterBody => ({
  basin: {
    id: basinId,
    name: basinId,
    position,
    size,
    terrainKind,
    depth: getBasinDepth(terrainKind),
    rimHeight: 0.08,
    type: 'WATERBASIN',
    capacity,
    state: 'STABLE',
  },
  source: {
    id: sourceId,
    name: sourceId,
    basinId,
    type: 'WATERSOURCE',
    capacity,
    amount: capacity * fillRatio,
    state,
  },
});

const createFixedWaterBodies = (): WaterBody[] =>
  FIXED_WATER_BASIN_LAYOUT.map((waterBasin) =>
    createWaterBody(
      waterBasin.id,
      waterBasin.sourceId,
      new THREE.Vector3(waterBasin.x, WATER_BASIN_Y, waterBasin.z),
      waterBasin.size,
      'POND',
      'CLEAN',
      100,
      DEFAULT_FILL_RATIO,
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

const getWaterBasinSpawnObstacle = (
  waterBasin: WaterBasin,
  candidateSize: [number, number],
): SpawnObstacle => ({
  position: waterBasin.position,
  minDistance:
    getBasinRadius(waterBasin)
    + getSpringRadius(candidateSize)
    + SPRING_SPAWN_CLEARANCE,
});

const chooseSpringState = (terrainKind: WaterTerrainKind): WaterSourceState => {
  if (terrainKind === 'MARSH') {
    return 'CLEAN';
  }

  return Math.random() < 0.18 ? 'POLLUTED' : 'CLEAN';
};

const createSpringWaterBodies = (
  occupiedAreas: SpawnObstacle[],
): WaterBody[] => {
  const springs: WaterBody[] = [];

  for (let i = 0; i < SPRING_COUNT; i++) {
    const size = chooseSpringSize();
    const spawnPosition = findSpawnPosition(occupiedAreas, {
      fieldLimit: SPRING_FIELD_LIMIT,
      maxAttempts: MAX_ATTEMPTS,
      y: WATER_BASIN_Y,
    });

    if (!spawnPosition) {
      continue;
    }

    const terrainKind = chooseSpringTerrainKind();
    const state = chooseSpringState(terrainKind);
    const capacity = getSpringCapacity(size);
    const spring = createWaterBody(
      `waterbasin_spring_${i}`,
      `watersource_spring_${i}`,
      spawnPosition,
      size,
      terrainKind,
      state,
      capacity,
      state === 'CLEAN' ? DEFAULT_FILL_RATIO : POLLUTED_FILL_RATIO,
    );

    springs.push(spring);
    occupiedAreas.push({
      position: spawnPosition,
      minDistance: Math.max(SPRING_MIN_SPACING, getSpringRadius(size) * 2 + SPRING_SPAWN_CLEARANCE),
    });
  }

  return springs;
};

export const createInitialWaterBodies = (): InitialWaterBodies => {
  const fixedWaterBodies = createFixedWaterBodies();
  const occupiedAreas: SpawnObstacle[] = fixedWaterBodies.map((waterBody) =>
    getWaterBasinSpawnObstacle(waterBody.basin, [SPRING_MAX_SIZE, SPRING_MAX_SIZE]));
  const springWaterBodies = createSpringWaterBodies(occupiedAreas);
  const waterBodies = [
    ...fixedWaterBodies,
    ...springWaterBodies,
  ];

  return {
    waterBasins: waterBodies.map((waterBody) => waterBody.basin),
    waterSources: waterBodies.map((waterBody) => waterBody.source),
  };
};
