import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import type { WorldTime } from '../../types/WorldTime';
import type { WaterSource, WaterSourceState, WaterTerrainKind } from '../../types/waterSource';
import { FIELD_LIMIT, getWaterSourceInteractionDistance } from './space';
import { getDaylightAmount } from './sky';
import { findSpawnPosition, type SpawnObstacle } from './spawning';
import { DRINK_RATE } from './waterSeeking';

const WATER_SOURCE_Y = 0.02;
const SPRING_FIELD_LIMIT = FIELD_LIMIT - 2;
const SPRING_RESPAWN_CHANCE_PER_SECOND = 0.06;
const SPRING_RESPAWN_CAPACITY = 24;
const SPRING_MIN_SPACING = 3.2;
const MAX_RESPAWN_ATTEMPTS = 100;
const BASE_SPRING_EVAPORATION_RATE = 0.035;
const DAYLIGHT_EVAPORATION_BONUS = 0.09;
const REFERENCE_SPRING_AREA = 1.4 * 1.4;

const getEvaporationRate = (
  waterSource: WaterSource,
  time: WorldTime,
): number => {
  const daylightFactor = getDaylightAmount(time);
  const surfaceArea = waterSource.size[0] * waterSource.size[1];
  const areaFactor = Math.sqrt(surfaceArea / REFERENCE_SPRING_AREA);
  const terrainFactor = waterSource.terrainKind === 'MARSH' ? 0.55 : 1;

  return (
    (BASE_SPRING_EVAPORATION_RATE + DAYLIGHT_EVAPORATION_BONUS * daylightFactor)
    * areaFactor
    * terrainFactor
  );
};

const isTemporarySpring = (waterSource: WaterSource): boolean =>
  waterSource.id.startsWith('watersource_spring_');

const chooseRespawnTerrainKind = (): WaterTerrainKind =>
  Math.random() < 0.2 ? 'MARSH' : 'POND';

const chooseRespawnState = (terrainKind: WaterTerrainKind): WaterSourceState => {
  if (terrainKind === 'MARSH') {
    return 'CLEAN';
  }

  return Math.random() < 0.18 ? 'POLLUTED' : 'CLEAN';
};

const getDrinkAmount = (
  waterSource: WaterSource,
  creatures: CreatureState[],
  delta: number,
): number => {
  const drinkingCreatures = creatures.filter((creature) =>
    creature.state === 'DRINKING'
    && creature.targetWaterSourceId === waterSource.id);

  return drinkingCreatures.length * DRINK_RATE * delta;
};

const updateWaterAmount = (
  waterSource: WaterSource,
  creatures: CreatureState[],
  time: WorldTime,
  delta: number,
): WaterSource => {
  if (!isTemporarySpring(waterSource) || waterSource.state === 'DRY') {
    return waterSource;
  }

  const nextAmount = Math.max(
    0,
    waterSource.amount
      - getDrinkAmount(waterSource, creatures, delta)
      - getEvaporationRate(waterSource, time) * delta,
  );

  return {
    ...waterSource,
    amount: nextAmount,
    state: nextAmount <= 0 ? 'DRY' : waterSource.state,
  };
};

const getRespawnObstacles = (
  currentWaterSource: WaterSource,
  waterSources: WaterSource[],
): SpawnObstacle[] =>
  waterSources
    .filter((waterSource) =>
      waterSource.id !== currentWaterSource.id && waterSource.state !== 'DRY')
    .map((waterSource) => ({
      position: waterSource.position,
      minDistance: isTemporarySpring(waterSource)
        ? SPRING_MIN_SPACING
        : getWaterSourceInteractionDistance(waterSource),
    }));

const respawnSpring = (
  waterSource: WaterSource,
  waterSources: WaterSource[],
  delta: number,
): WaterSource => {
  if (
    !isTemporarySpring(waterSource)
    || waterSource.state !== 'DRY'
    || Math.random() > SPRING_RESPAWN_CHANCE_PER_SECOND * delta
  ) {
    return waterSource;
  }

  const position = findSpawnPosition(getRespawnObstacles(waterSource, waterSources), {
    fieldLimit: SPRING_FIELD_LIMIT,
    maxAttempts: MAX_RESPAWN_ATTEMPTS,
    y: WATER_SOURCE_Y,
  });

  if (!position) {
    return waterSource;
  }

  const terrainKind = chooseRespawnTerrainKind();
  const state = chooseRespawnState(terrainKind);

  return {
    ...waterSource,
    position: new THREE.Vector3(position.x, WATER_SOURCE_Y, position.z),
    terrainKind,
    depth: terrainKind === 'MARSH' ? 0.35 : 1.5,
    capacity: SPRING_RESPAWN_CAPACITY,
    amount: state === 'CLEAN' ? SPRING_RESPAWN_CAPACITY : SPRING_RESPAWN_CAPACITY * 0.5,
    state,
  };
};

export const updateWaterSources = (
  waterSources: WaterSource[],
  creatures: CreatureState[],
  time: WorldTime,
  delta: number,
): WaterSource[] => {
  const drainedWaterSources = waterSources.map((waterSource) =>
    updateWaterAmount(waterSource, creatures, time, delta));

  return drainedWaterSources.map((waterSource) =>
    respawnSpring(waterSource, drainedWaterSources, delta));
};
