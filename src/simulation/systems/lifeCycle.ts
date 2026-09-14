import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import { createInitialStaminaProfile } from './fatigue';
import { createInitialWanderDirection, createInitialWanderTimer } from './movement';
import { FIELD_LIMIT, getCreatureHeightAtPosition } from './space';
import type { WaterBasin, WaterSource } from '../../types/waterSource';

export type CreatureLifeStage = 'CHILD' | 'ADULT' | 'OLD';

const ADULT_AGE = 720;
const OLD_AGE_RATIO = 0.75;
const REPRODUCTION_INTERVAL = 105;
const REPRODUCTION_JITTER = 45;
const OFFSPRING_DISTANCE = 2.2;
const MAX_CREATURES = 60;

export const isCreatureAlive = (creature: CreatureState): boolean =>
  creature.age < creature.lifeExpectancy
  && creature.hunger > 0
  && creature.thirst < 100;

export const getCreatureLifeStage = (creature: CreatureState): CreatureLifeStage => {
  if (creature.age < ADULT_AGE) return 'CHILD';
  if (creature.age >= creature.lifeExpectancy * OLD_AGE_RATIO) return 'OLD';
  return 'ADULT';
};

export const getCreatureScale = (creature: CreatureState): number => {
  if (getCreatureLifeStage(creature) === 'CHILD') {
    return 0.45 + 0.55 * (creature.age / ADULT_AGE);
  }

  return getCreatureLifeStage(creature) === 'OLD' ? 0.88 : 1;
};

const nextReproductionTimer = (): number =>
  REPRODUCTION_INTERVAL + Math.random() * REPRODUCTION_JITTER;

const createOffspring = (
  parent: CreatureState,
  serial: number,
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
): CreatureState => {
  const angle = Math.random() * Math.PI * 2;
  const distance = OFFSPRING_DISTANCE + Math.random() * OFFSPRING_DISTANCE;
  const position = parent.position.clone().add(new THREE.Vector3(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance,
  ));
  position.x = THREE.MathUtils.clamp(position.x, -FIELD_LIMIT, FIELD_LIMIT);
  position.z = THREE.MathUtils.clamp(position.z, -FIELD_LIMIT, FIELD_LIMIT);
  position.y = getCreatureHeightAtPosition(position, waterBasins, waterSources);
  const staminaProfile = createInitialStaminaProfile(serial);
  const id = `creature_${serial}`;

  return {
    ...parent,
    id,
    name: id,
    homeid: `home_${id}`,
    position,
    velocity: new THREE.Vector3(),
    wanderDirection: createInitialWanderDirection(),
    wanderTimer: createInitialWanderTimer(),
    targetWaterSourceId: null,
    targetFoodId: null,
    stamina: staminaProfile.maxStamina,
    staminaProfile,
    thirst: 0,
    hunger: 100,
    state: 'WANDERING',
    age: 0,
    lifeExpectancy: 4_320 + Math.random() * 2_880,
    generation: parent.generation + 1,
    parentIds: [parent.id],
    reproductionTimer: nextReproductionTimer(),
  };
};

export const updateCreatureLifeCycles = (
  creatures: CreatureState[],
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
  delta: number,
): CreatureState[] => {
  const livingCreatures = creatures
    .map((creature) => ({ ...creature, age: creature.age + delta, reproductionTimer: creature.reproductionTimer - delta }))
    .filter(isCreatureAlive);
  const availableSlots = MAX_CREATURES - livingCreatures.length;
  if (availableSlots <= 0) return livingCreatures;

  const usedIds = new Set(creatures.map((creature) => creature.id));
  let serial = 0;
  while (usedIds.has(`creature_${serial}`)) serial += 1;
  const offspring: CreatureState[] = [];
  const updatedCreatures = livingCreatures.map((creature) => {
    if (offspring.length >= availableSlots || getCreatureLifeStage(creature) !== 'ADULT' || creature.reproductionTimer > 0) {
      return creature;
    }

    offspring.push(createOffspring(creature, serial, waterBasins, waterSources));
    usedIds.add(`creature_${serial}`);
    do {
      serial += 1;
    } while (usedIds.has(`creature_${serial}`));
    return { ...creature, reproductionTimer: nextReproductionTimer() };
  });

  return [...updatedCreatures, ...offspring];
};
