import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import { isDrinkableWaterSource, type WaterSource } from '../../types/waterSource';
import {
  createInitialWanderDirection,
  createInitialWanderTimer,
  updateCreatureMovingTowardPosition,
  updateWanderingCreature,
} from './movement';
import {
  getWaterSourceInteractionDistance,
  getXZDistance,
} from './space';

export const SEEK_WATER_THIRST = 15;
export const DRINK_RATE = 10;
const FULLY_REHYDRATED_THIRST = 0;

const findNearestWaterSource = (
  creature: CreatureState,
  waterSources: WaterSource[],
): WaterSource | null => {
  const availableWaterSources = waterSources.filter(isDrinkableWaterSource);

  if (availableWaterSources.length === 0) {
    return null;
  }

  return availableWaterSources.reduce((nearestWaterSource, waterSource) => {
    const nearestDistance = getXZDistance(
      creature.position,
      nearestWaterSource.position,
    );
    const waterSourceDistance = getXZDistance(
      creature.position,
      waterSource.position,
    );

    return waterSourceDistance < nearestDistance
      ? waterSource
      : nearestWaterSource;
  });
};

const getTargetWaterSource = (
  creature: CreatureState,
  waterSources: WaterSource[],
): WaterSource | null => {
  const currentTargetWaterSource = waterSources.find((waterSource) =>
    waterSource.id === creature.targetWaterSourceId && isDrinkableWaterSource(waterSource));

  return currentTargetWaterSource ?? findNearestWaterSource(creature, waterSources);
};

const isAtWaterSource = (
  creature: CreatureState,
  waterSource: WaterSource,
): boolean =>
  getXZDistance(creature.position, waterSource.position)
    <= getWaterSourceInteractionDistance(waterSource);

const getWaterApproachPosition = (
  creature: CreatureState,
  waterSource: WaterSource,
): THREE.Vector3 => {
  const directionFromWater = creature.position.clone().sub(waterSource.position);
  directionFromWater.y = 0;

  if (directionFromWater.lengthSq() === 0) {
    directionFromWater.copy(createInitialWanderDirection());
  }

  return waterSource.position
    .clone()
    .add(
      directionFromWater
        .normalize()
        .multiplyScalar(getWaterSourceInteractionDistance(waterSource)),
    );
};

const setWandering = (creature: CreatureState): CreatureState => ({
  ...creature,
  state: 'WANDERING',
  targetWaterSourceId: null,
  wanderDirection: createInitialWanderDirection(),
  wanderTimer: createInitialWanderTimer(),
});

const drinkFromWaterSource = (
  creature: CreatureState,
  waterSource: WaterSource,
  delta: number,
): CreatureState => {
  const thirst = Math.max(
    creature.thirst - DRINK_RATE * delta,
    FULLY_REHYDRATED_THIRST,
  );

  if (thirst <= FULLY_REHYDRATED_THIRST) {
    return setWandering({
      ...creature,
      thirst,
      velocity: new THREE.Vector3(0, 0, 0),
    });
  }

  return {
    ...creature,
    thirst,
    velocity: new THREE.Vector3(0, 0, 0),
    state: 'DRINKING',
    targetWaterSourceId: waterSource.id,
  };
};

const headToWaterSource = (
  creature: CreatureState,
  creatures: CreatureState[],
  waterSources: WaterSource[],
  waterSource: WaterSource,
  delta: number,
): CreatureState => {
  if (isAtWaterSource(creature, waterSource)) {
    return drinkFromWaterSource(creature, waterSource, delta);
  }

  const approachPosition = getWaterApproachPosition(creature, waterSource);
  const movedCreature = updateCreatureMovingTowardPosition(
    {
      ...creature,
      state: 'HEADING_TO_WATER',
      targetWaterSourceId: waterSource.id,
    },
    approachPosition,
    creatures,
    waterSources,
    delta,
    {
      ignoredObstacleIds: [waterSource.id],
    },
  );

  return {
    ...movedCreature,
    state: 'HEADING_TO_WATER',
    targetWaterSourceId: waterSource.id,
  };
};

export const updateCreatureWaterBehavior = (
  creature: CreatureState,
  creatures: CreatureState[],
  waterSources: WaterSource[],
  delta: number,
): CreatureState => {
  const shouldSeekWater =
    creature.state === 'HEADING_TO_WATER'
    || creature.state === 'DRINKING'
    || creature.thirst >= SEEK_WATER_THIRST;

  if (!shouldSeekWater) {
    return updateWanderingCreature(
      {
        ...creature,
        targetWaterSourceId: null,
      },
      creatures,
      waterSources,
      delta,
    );
  }

  const waterSource = getTargetWaterSource(creature, waterSources);

  if (!waterSource) {
    return updateWanderingCreature(setWandering(creature), creatures, waterSources, delta);
  }

  if (creature.state === 'DRINKING') {
    return isAtWaterSource(creature, waterSource)
      ? drinkFromWaterSource(creature, waterSource, delta)
      : headToWaterSource(creature, creatures, waterSources, waterSource, delta);
  }

  return headToWaterSource(creature, creatures, waterSources, waterSource, delta);
};
