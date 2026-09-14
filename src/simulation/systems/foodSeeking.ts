import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import type { GrassBlade, PlantFood } from '../../types/vegetation';
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
  consumedFood: { kind: 'GRASS' | 'PLANT_FOOD'; id: string } | null;
};

type FoodTarget = {
  id: string;
  position: THREE.Vector3;
  nutrition: number;
  kind: 'GRASS' | 'PLANT_FOOD';
};

const setWandering = (creature: CreatureState): CreatureState => ({
  ...creature,
  state: 'WANDERING',
  targetFoodId: null,
  wanderDirection: createInitialWanderDirection(),
  wanderTimer: createInitialWanderTimer(),
});

const findNearestFood = (
  creature: CreatureState,
  grassBlades: GrassBlade[],
  plantFoods: PlantFood[],
): FoodTarget | null => {
  const availableFood: FoodTarget[] = [
    ...grassBlades
      .filter((grassBlade) => grassBlade.isEdible)
      .map((grassBlade) => ({
        id: grassBlade.id,
        position: grassBlade.position,
        nutrition: GRASS_NUTRITION,
        kind: 'GRASS' as const,
      })),
    ...plantFoods
      .filter((plantFood) => plantFood.isAvailable)
      .map((plantFood) => ({
        id: plantFood.id,
        position: plantFood.position,
        nutrition: plantFood.nutrition,
        kind: 'PLANT_FOOD' as const,
      })),
  ];
  const currentTarget = availableFood.find((food) => food.id === creature.targetFoodId);

  if (currentTarget) return currentTarget;

  let nearest: FoodTarget | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const food of availableFood) {
    const distance = getXZDistance(creature.position, food.position);
    if (distance < nearestDistance) {
      nearest = food;
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
  plantFoods: PlantFood[],
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
  delta: number,
): FoodBehaviorResult => {
  const target = findNearestFood(creature, grassBlades, plantFoods);

  if (!target) {
    return {
      creature: updateWanderingCreature(
        setWandering(creature),
        creatures,
        waterBasins,
        waterSources,
        delta,
      ),
      consumedFood: null,
    };
  }

  if (getXZDistance(creature.position, target.position) <= EATING_DISTANCE) {
    return {
      creature: {
        ...creature,
        hunger: Math.min(MAX_SATIETY, creature.hunger + target.nutrition),
        velocity: new THREE.Vector3(),
        state: 'EATING',
        targetFoodId: null,
      },
      consumedFood: { kind: target.kind, id: target.id },
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
    consumedFood: null,
  };
};
