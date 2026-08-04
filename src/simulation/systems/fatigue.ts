import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import type { WorldTime } from '../../types/WorldTime';
import { getDaylightAmount } from './sky';

const MAX_STAMINA = 100;
const FORCED_REST_STAMINA = 15;
const RESTED_STAMINA = 55;
const DAYLIGHT_ACTIVITY_THRESHOLD = 0.25;
const DAYTIME_DISTANCE_COST = 4.5;
const DAYTIME_SPEED_COST = 0.5;
const NIGHT_RECOVERY_RATE = 7;
const REST_RECOVERY_RATE = 10;

export const shouldForceRest = (creature: CreatureState): boolean =>
  creature.stamina <= FORCED_REST_STAMINA;

export const shouldKeepResting = (creature: CreatureState): boolean =>
  creature.state === 'RESTING' && creature.stamina < RESTED_STAMINA;

export const recoverRestingCreature = (
  creature: CreatureState,
  time: WorldTime,
  delta: number,
): CreatureState => {
  const daylight = getDaylightAmount(time);
  const recoveryRate = daylight <= DAYLIGHT_ACTIVITY_THRESHOLD
    ? NIGHT_RECOVERY_RATE + REST_RECOVERY_RATE
    : REST_RECOVERY_RATE;
  const stamina = Math.min(MAX_STAMINA, creature.stamina + recoveryRate * delta);

  return {
    ...creature,
    stamina,
    velocity: new THREE.Vector3(0, 0, 0),
    state: stamina >= RESTED_STAMINA ? 'WANDERING' : 'RESTING',
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

  if (after.state === 'DRINKING') {
    return after;
  }

  if (daylight <= DAYLIGHT_ACTIVITY_THRESHOLD) {
    return {
      ...after,
      stamina: Math.min(MAX_STAMINA, after.stamina + NIGHT_RECOVERY_RATE * delta),
    };
  }

  const distance = before.position.distanceTo(after.position);
  const speed = delta > 0 ? distance / delta : 0;
  const staminaCost = distance * DAYTIME_DISTANCE_COST + speed * DAYTIME_SPEED_COST * delta;
  const stamina = Math.max(0, after.stamina - staminaCost);

  if (stamina <= FORCED_REST_STAMINA) {
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
