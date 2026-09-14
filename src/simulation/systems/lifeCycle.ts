import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import { createInitialStaminaProfile } from './fatigue';
import { createInitialWanderDirection, createInitialWanderTimer } from './movement';
import { FIELD_LIMIT, getCreatureHeightAtPosition } from './space';
import type { WaterBasin, WaterSource } from '../../types/waterSource';

export type CreatureLifeStage = 'CHILD' | 'ADULT' | 'OLD';

const ADULT_AGE = 720;
const OLD_AGE_RATIO = 0.75;
const OFFSPRING_DISTANCE = 2.2;

export const REPRODUCTION_PROFILE = {
  maxCreatures: 60,
  mateSearchRadius: 6,
  pairFormationChancePerSecond: 0.08,
  birthProximity: 8,
  birthAttemptInterval: 144,
  birthAttemptJitter: 72,
  birthChancePerAttempt: 0.35,
} as const;

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
  REPRODUCTION_PROFILE.birthAttemptInterval
  + Math.random() * REPRODUCTION_PROFILE.birthAttemptJitter;

const createOffspring = (
  parent: CreatureState,
  partner: CreatureState,
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
    parentIds: [parent.id, partner.id],
    sex: Math.random() < 0.5 ? 'FEMALE' : 'MALE',
    partnerId: null,
    reproductionTimer: nextReproductionTimer(),
  };
};

const pairEligibleCreatures = (
  creatures: CreatureState[],
  delta: number,
): CreatureState[] => {
  const livingIds = new Set(creatures.map((creature) => creature.id));
  const pairedCreatures = creatures.map((creature) => ({
    ...creature,
    partnerId: creature.partnerId && livingIds.has(creature.partnerId)
      ? creature.partnerId
      : null,
  }));
  const pairedIds = new Set(
    pairedCreatures
      .filter((creature) => creature.partnerId)
      .map((creature) => creature.id),
  );

  for (const creature of pairedCreatures) {
    if (pairedIds.has(creature.id) || getCreatureLifeStage(creature) !== 'ADULT') {
      continue;
    }

    const mate = pairedCreatures
      .filter((candidate) =>
        candidate.id !== creature.id
        && !pairedIds.has(candidate.id)
        && candidate.sex !== creature.sex
        && getCreatureLifeStage(candidate) === 'ADULT'
        && candidate.position.distanceTo(creature.position)
          <= REPRODUCTION_PROFILE.mateSearchRadius)
      .sort((left, right) =>
        left.position.distanceTo(creature.position)
        - right.position.distanceTo(creature.position))[0];

    if (
      mate
      && Math.random()
        < REPRODUCTION_PROFILE.pairFormationChancePerSecond * delta
    ) {
      creature.partnerId = mate.id;
      mate.partnerId = creature.id;
      pairedIds.add(creature.id);
      pairedIds.add(mate.id);
    }
  }

  return pairedCreatures;
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
  const pairedCreatures = pairEligibleCreatures(livingCreatures, delta);
  const availableSlots = REPRODUCTION_PROFILE.maxCreatures - pairedCreatures.length;
  if (availableSlots <= 0) return pairedCreatures;

  const usedIds = new Set(creatures.map((creature) => creature.id));
  let serial = 0;
  while (usedIds.has(`creature_${serial}`)) serial += 1;
  const offspring: CreatureState[] = [];
  const updatedCreatures = pairedCreatures.map((creature) => {
    if (
      offspring.length >= availableSlots
      || creature.sex !== 'FEMALE'
      || getCreatureLifeStage(creature) !== 'ADULT'
      || creature.reproductionTimer > 0
      || !creature.partnerId
    ) {
      return creature;
    }

    const partner = pairedCreatures.find(
      (candidate) => candidate.id === creature.partnerId,
    );
    const canAttemptBirth = partner
      && getCreatureLifeStage(partner) === 'ADULT'
      && partner.position.distanceTo(creature.position)
        <= REPRODUCTION_PROFILE.birthProximity;

    if (!canAttemptBirth) return creature;

    const reproductionTimer = nextReproductionTimer();
    if (Math.random() >= REPRODUCTION_PROFILE.birthChancePerAttempt) {
      return { ...creature, reproductionTimer };
    }

    offspring.push(createOffspring(
      creature,
      partner,
      serial,
      waterBasins,
      waterSources,
    ));
    usedIds.add(`creature_${serial}`);
    do {
      serial += 1;
    } while (usedIds.has(`creature_${serial}`));
    return { ...creature, reproductionTimer };
  });

  return [...updatedCreatures, ...offspring];
};
