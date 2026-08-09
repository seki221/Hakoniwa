import * as THREE from 'three';
import type { CreatureStaminaProfile, CreatureState } from '../../types/creature';
import type { WorldTime } from '../../types/WorldTime';
import { getDaylightAmount } from './sky';

const DAYLIGHT_ACTIVITY_THRESHOLD = 0.25;

export const DEFAULT_STAMINA_PROFILE: CreatureStaminaProfile = {
  maxStamina: 100,
  forcedRestRatio: 0.15,
  restedRatio: 0.55,
  daytimeDistanceCost: 4.5,
  daytimeSpeedCost: 0.5,
  nightRecoveryRate: 7,
  restRecoveryRate: 10,
};

export const createInitialStaminaProfile = (index: number): CreatureStaminaProfile => {
  const staminaVariation = (index % 5) * 4;
  const recoveryVariation = (index % 3) - 1;

  return {
    ...DEFAULT_STAMINA_PROFILE,
    maxStamina: DEFAULT_STAMINA_PROFILE.maxStamina + staminaVariation,
    nightRecoveryRate: DEFAULT_STAMINA_PROFILE.nightRecoveryRate + recoveryVariation,
    restRecoveryRate: DEFAULT_STAMINA_PROFILE.restRecoveryRate + recoveryVariation,
  };
};

const getForcedRestStamina = (creature: CreatureState): number =>
  creature.staminaProfile.maxStamina * creature.staminaProfile.forcedRestRatio;

const getRestedStamina = (creature: CreatureState): number =>
  creature.staminaProfile.maxStamina * creature.staminaProfile.restedRatio;

export const shouldForceRest = (creature: CreatureState): boolean =>
  creature.stamina <= getForcedRestStamina(creature);

export const shouldKeepResting = (creature: CreatureState): boolean =>
  creature.state === 'RESTING' && creature.stamina < getRestedStamina(creature);

export const recoverRestingCreature = (
  creature: CreatureState,
  time: WorldTime,
  delta: number,
): CreatureState => {
  const daylight = getDaylightAmount(time);
  const { maxStamina, nightRecoveryRate, restRecoveryRate } = creature.staminaProfile;
  const recoveryRate = daylight <= DAYLIGHT_ACTIVITY_THRESHOLD
    ? nightRecoveryRate + restRecoveryRate
    : restRecoveryRate;
  const stamina = Math.min(maxStamina, creature.stamina + recoveryRate * delta);

  return {
    ...creature,
    stamina,
    velocity: new THREE.Vector3(0, 0, 0),
    state: stamina >= getRestedStamina(creature) ? 'WANDERING' : 'RESTING',
    targetWaterSourceId: null,
  };
};

export const updateStaminaAfterActivity = (
  before: CreatureState,
  after: CreatureState,
  time: WorldTime,
  delta: number,
): CreatureState => {
  const daylight = getDaylightAmount(time);
  const {
    maxStamina,
    nightRecoveryRate,
    daytimeDistanceCost,
    daytimeSpeedCost,
  } = after.staminaProfile;

  if (after.state === 'DRINKING') {
    return after;
  }

  if (daylight <= DAYLIGHT_ACTIVITY_THRESHOLD) {
    return {
      ...after,
      stamina: Math.min(maxStamina, after.stamina + nightRecoveryRate * delta),
    };
  }

  const distance = before.position.distanceTo(after.position);
  const speed = delta > 0 ? distance / delta : 0;
  const staminaCost = distance * daytimeDistanceCost + speed * daytimeSpeedCost * delta;
  const stamina = Math.max(0, after.stamina - staminaCost);

  if (stamina <= getForcedRestStamina(after)) {
    return {
      ...after,
      stamina,
      velocity: new THREE.Vector3(0, 0, 0),
      state: 'RESTING',
      targetWaterSourceId: null,
    };
  }

  return {
    ...after,
    stamina,
  };
};
