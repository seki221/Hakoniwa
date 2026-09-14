import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import type { GrassBlade } from '../../types/vegetation';
import type { WaterBasin, WaterSource } from '../../types/waterSource';
import {
  createInitialWanderDirection,
  createInitialWanderTimer,
  updateCreatureMovingTowardPosition,
  updateWanderingCreature,
} from './movement';
import { getXZDistance } from './space';
import { MAX_SATIETY } from './hunger';

export const SEEK_FOOD_SATIETY = 65;
const GRASS_NUTRITION = 35;
const EATING_DISTANCE = 0.9;

export type FoodBehaviorResult = {
  creature: CreatureState;
  consumedGrassId: string | null;
};

const setWandering = (creature: CreatureState): CreatureState => ({
  ...creature,
  state: 'WANDERING',
  targetFoodId: null,
  wanderDirection: createInitialWanderDirection(),
  wanderTimer: createInitialWanderTimer(),
});

const findNearestGrass = (
  creature: CreatureState,
  grassBlades: GrassBlade[],
): GrassBlade | null => {
  const currentTarget = grassBlades.find(
    (grassBlade) => grassBlade.id === creature.targetFoodId && grassBlade.isEdible,
  );

  if (currentTarget) return currentTarget;

  let nearest: GrassBlade | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const grassBlade of grassBlades) {
    if (!grassBlade.isEdible) continue;
    const distance = getXZDistance(creature.position, grassBlade.position);
    if (distance < nearestDistance) {
      nearest = grassBlade;
      nearestDistance = distance;
    }
  }

  return nearest;
};

export const shouldCreatureSeekFood = (creature: CreatureState): boolean =>
  creature.state === 'HEADING_TO_FOOD'
  || creature.state === 'EATING'
  || creature.hunger <= SEEK_FOOD_SATIETY;

export const updateCreatureFoodBehavior = (
  creature: CreatureState,
  creatures: CreatureState[],
  grassBlades: GrassBlade[],
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
  delta: number,
): FoodBehaviorResult => {
  const target = findNearestGrass(creature, grassBlades);

  if (!target) {
    return {
      creature: updateWanderingCreature(
        setWandering(creature),
        creatures,
        waterBasins,
        waterSources,
        delta,
      ),
      consumedGrassId: null,
    };
  }

  if (getXZDistance(creature.position, target.position) <= EATING_DISTANCE) {
    return {
      creature: {
        ...creature,
        hunger: Math.min(MAX_SATIETY, creature.hunger + GRASS_NUTRITION),
        velocity: new THREE.Vector3(),
        state: 'EATING',
        targetFoodId: null,
      },
      consumedGrassId: target.id,
    };
  }

  const movedCreature = updateCreatureMovingTowardPosition(
    {
      ...creature,
      state: 'HEADING_TO_FOOD',
      targetFoodId: target.id,
      targetWaterSourceId: null,
    },
    target.position,
    creatures,
    waterBasins,
    waterSources,
    delta,
  );

  return {
    creature: {
      ...movedCreature,
      state: 'HEADING_TO_FOOD',
      targetFoodId: target.id,
    },
    consumedGrassId: null,
  };
};
