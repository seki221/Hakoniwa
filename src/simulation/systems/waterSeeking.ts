import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import {
  getWaterBasinBySource,
  isDrinkableWaterSource,
  type WaterBasin,
  type WaterSource,
} from '../../types/waterSource';
import {
  createInitialWanderDirection,
  createInitialWanderTimer,
  updateCreatureMovingTowardPosition,
  updateWanderingCreature,
} from './movement';
import {
  getWaterBasinInteractionDistance,
  getXZDistance,
} from './space';

export const SEEK_WATER_THIRST = 15;
export const DRINK_RATE = 10;
const FULLY_REHYDRATED_THIRST = 0;

type WaterTarget = {
  basin: WaterBasin;
  source: WaterSource;
};

const isDrinkableWaterTarget = (
  waterSource: WaterSource,
  waterBasin: WaterBasin,
): boolean =>
  isDrinkableWaterSource(waterSource)
  && (
    waterBasin.terrainKind === 'POND'
    || waterBasin.terrainKind === 'RIVER'
  );

const findNearestWaterSource = (
  creature: CreatureState,
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
): WaterTarget | null => {
  const availableWaterTargets = waterSources
    .reduce<WaterTarget[]>((targets, waterSource) => {
      const waterBasin = getWaterBasinBySource(waterSource, waterBasins);

      if (!waterBasin || !isDrinkableWaterTarget(waterSource, waterBasin)) {
        return targets;
      }

      return [
        ...targets,
        {
          basin: waterBasin,
          source: waterSource,
        },
      ];
    }, []);

  if (availableWaterTargets.length === 0) {
    return null;
  }

  return availableWaterTargets.reduce((nearestWaterTarget, waterTarget) => {
    const nearestDistance = getXZDistance(
      creature.position,
      nearestWaterTarget.basin.position,
    );
    const waterTargetDistance = getXZDistance(
      creature.position,
      waterTarget.basin.position,
    );

    return waterTargetDistance < nearestDistance
      ? waterTarget
      : nearestWaterTarget;
  });
};

const getTargetWaterSource = (
  creature: CreatureState,
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
): WaterTarget | null => {
  const currentTargetWaterSource = waterSources.find((waterSource) =>
    waterSource.id === creature.targetWaterSourceId);
  const currentTargetWaterBasin = currentTargetWaterSource
    ? getWaterBasinBySource(currentTargetWaterSource, waterBasins)
    : null;

  return currentTargetWaterSource
    && currentTargetWaterBasin
    && isDrinkableWaterTarget(currentTargetWaterSource, currentTargetWaterBasin)
    ? {
      basin: currentTargetWaterBasin,
      source: currentTargetWaterSource,
    }
    : findNearestWaterSource(creature, waterBasins, waterSources);
};

const isAtWaterSource = (
  creature: CreatureState,
  waterBasin: WaterBasin,
): boolean =>
  getXZDistance(creature.position, waterBasin.position)
    <= getWaterBasinInteractionDistance(waterBasin);

const getWaterApproachPosition = (
  creature: CreatureState,
  waterBasin: WaterBasin,
): THREE.Vector3 => {
  const directionFromWater = creature.position.clone().sub(waterBasin.position);
  directionFromWater.y = 0;

  if (directionFromWater.lengthSq() === 0) {
    directionFromWater.copy(createInitialWanderDirection());
  }

  return waterBasin.position
    .clone()
    .add(
      directionFromWater
        .normalize()
        .multiplyScalar(getWaterBasinInteractionDistance(waterBasin)),
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
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
  waterTarget: WaterTarget,
  delta: number,
): CreatureState => {
  if (isAtWaterSource(creature, waterTarget.basin)) {
    return drinkFromWaterSource(creature, waterTarget.source, delta);
  }

  const approachPosition = getWaterApproachPosition(creature, waterTarget.basin);
  const movedCreature = updateCreatureMovingTowardPosition(
    {
      ...creature,
      state: 'HEADING_TO_WATER',
      targetWaterSourceId: waterTarget.source.id,
    },
    approachPosition,
    creatures,
    waterBasins,
    waterSources,
    delta,
    {
      ignoredObstacleIds: [waterTarget.source.id],
    },
  );

  return {
    ...movedCreature,
    state: 'HEADING_TO_WATER',
    targetWaterSourceId: waterTarget.source.id,
  };
};

export const updateCreatureWaterBehavior = (
  creature: CreatureState,
  creatures: CreatureState[],
  waterBasins: WaterBasin[],
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
      waterBasins,
      waterSources,
      delta,
    );
  }

  const waterTarget = getTargetWaterSource(creature, waterBasins, waterSources);

  if (!waterTarget) {
    return updateWanderingCreature(
      setWandering(creature),
      creatures,
      waterBasins,
      waterSources,
      delta,
    );
  }

  if (creature.state === 'DRINKING') {
    return isAtWaterSource(creature, waterTarget.basin)
      ? drinkFromWaterSource(creature, waterTarget.source, delta)
      : headToWaterSource(creature, creatures, waterBasins, waterSources, waterTarget, delta);
  }

  return headToWaterSource(creature, creatures, waterBasins, waterSources, waterTarget, delta);
};
