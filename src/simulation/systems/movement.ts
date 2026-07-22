import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import type { WaterSource } from '../../types/waterSource';
import { isTooClose } from './spawning';

const FIELD_LIMIT = 7;
const CREATURE_MIN_SPACING = 2.5;
const BASE_WANDER_SPEED = 1.4;
const DEHYDRATED_THIRST = 80;
const DEHYDRATED_SPEED_MULTIPLIER = 0.5;
const MIN_DIRECTION_TIME = 1.2;
const MAX_DIRECTION_TIME = 3.2;

const createRandomDirection = (): THREE.Vector3 => {
  const angle = Math.random() * Math.PI * 2;

  return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
};

const createDirectionTimer = (): number =>
  MIN_DIRECTION_TIME + Math.random() * (MAX_DIRECTION_TIME - MIN_DIRECTION_TIME);

const clampToField = (position: THREE.Vector3): THREE.Vector3 =>
  new THREE.Vector3(
    THREE.MathUtils.clamp(position.x, -FIELD_LIMIT, FIELD_LIMIT),
    position.y,
    THREE.MathUtils.clamp(position.z, -FIELD_LIMIT, FIELD_LIMIT),
  );

const getBlockedPositions = (
  creature: CreatureState,
  creatures: CreatureState[],
  waterSources: WaterSource[],
): THREE.Vector3[] => [
  ...creatures
    .filter((otherCreature) => otherCreature.id !== creature.id)
    .map((otherCreature) => otherCreature.position),
  ...waterSources.map((waterSource) => waterSource.position),
];

export const createInitialWanderDirection = createRandomDirection;

export const createInitialWanderTimer = createDirectionTimer;

export const updateWanderingCreature = (
  creature: CreatureState,
  creatures: CreatureState[],
  waterSources: WaterSource[],
  delta: number,
): CreatureState => {
  const shouldChangeDirection = creature.wanderTimer <= 0;
  const wanderDirection = shouldChangeDirection
    ? createRandomDirection()
    : creature.wanderDirection;
  const wanderTimer = shouldChangeDirection
    ? createDirectionTimer()
    : creature.wanderTimer - delta;
  const speedMultiplier = creature.thirst >= DEHYDRATED_THIRST
    ? DEHYDRATED_SPEED_MULTIPLIER
    : 1;
  const nextPosition = clampToField(
    creature.position.clone().add(
      wanderDirection.clone().multiplyScalar(BASE_WANDER_SPEED * speedMultiplier * delta),
    ),
  );
  const blockedPositions = getBlockedPositions(creature, creatures, waterSources);
  const isBlocked = blockedPositions.some((position) =>
    isTooClose(nextPosition, position, CREATURE_MIN_SPACING),
  );

  if (isBlocked) {
    return {
      ...creature,
      wanderDirection: createRandomDirection(),
      wanderTimer: createDirectionTimer(),
    };
  }

  return {
    ...creature,
    position: nextPosition,
    wanderDirection,
    wanderTimer,
  };
};
