import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import type { WaterSource } from '../../types/waterSource';
import { isTooClose } from './spawning';
import {
  FIELD_LIMIT,
  getWaterSourceInteractionDistance,
  getXZDistance,
} from './space';

// 生物間の隙間
const CREATURE_MIN_SPACING = 1;
// 基本探索速度
const BASE_WANDER_SPEED = 1.4;
// 目標速度へどれくらい素早く近づくか。大きいほどキビキビ、小さいほどヌルっと動く。
const STEERING_SMOOTHING = 1.5;
// 障害物や端にぶつかりそうな時に速度をどれくらい落とすか。
const BLOCKED_VELOCITY_DAMPING = 0.1;
// ぶつかりそうな時に、離脱方向へ出す速度倍率
const BLOCKED_ESCAPE_SPEED_MULTIPLIER = 0.7;
// 近づきすぎる前から避け始める距離
const AVOIDANCE_LOOKAHEAD = 1.2;
// 他オブジェクトから離れる力
const OBJECT_AVOIDANCE_WEIGHT = 2.2;
// フィールド端から避け始める距離
const FIELD_EDGE_MARGIN = 1.2;
// フィールド端から内側へ戻る力
const FIELD_EDGE_AVOIDANCE_WEIGHT = 1.6;
// 通常時の速度倍率
const NORMAL_SPEED_MULTIPLIER = 1;
// 脱水気味とみなす喉の渇き
const DEHYDRATED_THIRST = 80;
// 脱水気味の速度倍率
const DEHYDRATED_SPEED_MULTIPLIER = 0.5;
// 最小方向切り替え時間
const MIN_DIRECTION_TIME = 1.2;
// 最大方向切り替え時間
const MAX_DIRECTION_TIME = 3.2;

type MovementObstacle = {
  id: string;
  position: THREE.Vector3;
  minDistance: number;
};

type MovementOptions = {
  ignoredObstacleIds?: string[];
  speedMultiplier?: number;
};

type MovementConfig = MovementOptions & {
  nextWanderDirection: THREE.Vector3;
  nextWanderTimer: number;
};

// ランダムな進行方向
const createRandomDirection = (): THREE.Vector3 => {
  const angle = Math.random() * Math.PI * 2;

  return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
};
// 方向転換タイマー
const createDirectionTimer = (): number =>
  MIN_DIRECTION_TIME + Math.random() * (MAX_DIRECTION_TIME - MIN_DIRECTION_TIME);

// フィールド外へ出さない処理
const clampToField = (position: THREE.Vector3): THREE.Vector3 =>
  new THREE.Vector3(
    THREE.MathUtils.clamp(position.x, -FIELD_LIMIT, FIELD_LIMIT),
    position.y,
    THREE.MathUtils.clamp(position.z, -FIELD_LIMIT, FIELD_LIMIT),
  );

// 移動時に避ける対象を集める処理
const getMovementObstacles = (
  creature: CreatureState,
  creatures: CreatureState[],
  waterSources: WaterSource[],
  ignoredObstacleIds: Set<string>,
): MovementObstacle[] => [
  ...creatures
    .filter((otherCreature) =>
      otherCreature.id !== creature.id && !ignoredObstacleIds.has(otherCreature.id))
    .map((otherCreature) => ({
      id: otherCreature.id,
      position: otherCreature.position,
      minDistance: CREATURE_MIN_SPACING,
    })),
  ...waterSources
    .filter((waterSource) => !ignoredObstacleIds.has(waterSource.id))
    .map((waterSource) => ({
      id: waterSource.id,
      position: waterSource.position,
      minDistance: getWaterSourceInteractionDistance(waterSource),
    })),
];

const getMinimumClearanceRatio = (
  position: THREE.Vector3,
  obstacles: MovementObstacle[],
): number =>
  obstacles.reduce((minimumRatio, obstacle) => {
    const distance = getXZDistance(position, obstacle.position);
    const ratio = distance / obstacle.minDistance;

    return Math.min(minimumRatio, ratio);
  }, Number.POSITIVE_INFINITY);

const isMovingCloserToBlockedArea = (
  currentPosition: THREE.Vector3,
  nextPosition: THREE.Vector3,
  obstacles: MovementObstacle[],
): boolean => {
  const currentClearance = getMinimumClearanceRatio(currentPosition, obstacles);
  const nextClearance = getMinimumClearanceRatio(nextPosition, obstacles);

  return nextClearance < 1 && nextClearance < currentClearance;
};

const isPositionBlocked = (
  position: THREE.Vector3,
  obstacles: MovementObstacle[],
): boolean =>
  obstacles.some((obstacle) =>
    isTooClose(position, obstacle.position, obstacle.minDistance),
  );

const getObjectAvoidanceVector = (
  position: THREE.Vector3,
  obstacles: MovementObstacle[],
): THREE.Vector3 =>
  obstacles.reduce((avoidanceVector, obstacle) => {
    const offset = position.clone().sub(obstacle.position);
    offset.y = 0;

    const distance = offset.length();
    const avoidanceDistance = obstacle.minDistance + AVOIDANCE_LOOKAHEAD;

    if (distance === 0) {
      return avoidanceVector.add(createRandomDirection());
    }

    if (distance >= avoidanceDistance) {
      return avoidanceVector;
    }

    const strength = (avoidanceDistance - distance) / avoidanceDistance;

    return avoidanceVector.add(offset.normalize().multiplyScalar(strength));
  }, new THREE.Vector3(0, 0, 0));

const getFieldEdgeAvoidanceVector = (position: THREE.Vector3): THREE.Vector3 => {
  const avoidanceVector = new THREE.Vector3(0, 0, 0);
  const minSafePosition = -FIELD_LIMIT + FIELD_EDGE_MARGIN;
  const maxSafePosition = FIELD_LIMIT - FIELD_EDGE_MARGIN;

  if (position.x < minSafePosition) {
    avoidanceVector.x += (minSafePosition - position.x) / FIELD_EDGE_MARGIN;
  }

  if (position.x > maxSafePosition) {
    avoidanceVector.x -= (position.x - maxSafePosition) / FIELD_EDGE_MARGIN;
  }

  if (position.z < minSafePosition) {
    avoidanceVector.z += (minSafePosition - position.z) / FIELD_EDGE_MARGIN;
  }

  if (position.z > maxSafePosition) {
    avoidanceVector.z -= (position.z - maxSafePosition) / FIELD_EDGE_MARGIN;
  }

  return avoidanceVector;
};

const getSteeredDirection = (
  position: THREE.Vector3,
  wanderDirection: THREE.Vector3,
  obstacles: MovementObstacle[],
): THREE.Vector3 => {
  const objectAvoidance = getObjectAvoidanceVector(position, obstacles)
    .multiplyScalar(OBJECT_AVOIDANCE_WEIGHT);
  const fieldEdgeAvoidance = getFieldEdgeAvoidanceVector(position)
    .multiplyScalar(FIELD_EDGE_AVOIDANCE_WEIGHT);
  const steeredDirection = wanderDirection
    .clone()
    .add(objectAvoidance)
    .add(fieldEdgeAvoidance);

  if (steeredDirection.lengthSq() === 0) {
    return createRandomDirection();
  }

  return steeredDirection.normalize();
};

const getEscapeDirection = (
  position: THREE.Vector3,
  obstacles: MovementObstacle[],
  fallbackDirection: THREE.Vector3,
): THREE.Vector3 => {
  const escapeDirection = getObjectAvoidanceVector(position, obstacles)
    .add(getFieldEdgeAvoidanceVector(position));

  if (escapeDirection.lengthSq() > 0) {
    return escapeDirection.normalize();
  }

  if (fallbackDirection.lengthSq() > 0) {
    return fallbackDirection.clone().negate().normalize();
  }

  return createRandomDirection();
};

export const createInitialWanderDirection = createRandomDirection;

export const createInitialWanderTimer = createDirectionTimer;

const getThirstSpeedMultiplier = (creature: CreatureState): number =>
  creature.thirst >= DEHYDRATED_THIRST
    ? DEHYDRATED_SPEED_MULTIPLIER
    : NORMAL_SPEED_MULTIPLIER;

const updateCreatureMovement = (
  creature: CreatureState,
  desiredDirection: THREE.Vector3,
  creatures: CreatureState[],
  waterSources: WaterSource[],
  delta: number,
  config: MovementConfig,
): CreatureState => {
  // 脱水による速度調整
  const speedMultiplier = config.speedMultiplier ?? getThirstSpeedMultiplier(creature);
  const ignoredObstacleIds = new Set(config.ignoredObstacleIds ?? []);
  const obstacles = getMovementObstacles(
    creature,
    creatures,
    waterSources,
    ignoredObstacleIds,
  );
  const steeredDirection = getSteeredDirection(
    creature.position,
    desiredDirection,
    obstacles,
  );
  // 目標速度。いきなりこの速度にせず、下のlerpで現在速度から徐々に近づける。
  const desiredVelocity = steeredDirection
    .clone()
    .multiplyScalar(BASE_WANDER_SPEED * speedMultiplier);
  const steeringAmount = 1 - Math.exp(-STEERING_SMOOTHING * delta);
  const velocity = creature.velocity.clone().lerp(desiredVelocity, steeringAmount);
  // 次の位置を計算
  const rawNextPosition = creature.position.clone().add(velocity.clone().multiplyScalar(delta));
  const nextPosition = clampToField(rawNextPosition);
  const hitFieldEdge = !nextPosition.equals(rawNextPosition);
  // 衝突判定
  const isBlocked = isMovingCloserToBlockedArea(
    creature.position,
    nextPosition,
    obstacles,
  );

  if (isBlocked) {
    const escapeDirection = getEscapeDirection(
      creature.position,
      obstacles,
      steeredDirection,
    );
    const escapeVelocity = escapeDirection
      .clone()
      .multiplyScalar(BASE_WANDER_SPEED * speedMultiplier * BLOCKED_ESCAPE_SPEED_MULTIPLIER);
    const escapePosition = clampToField(
      creature.position.clone().add(escapeVelocity.clone().multiplyScalar(delta)),
    );
    const currentClearance = getMinimumClearanceRatio(creature.position, obstacles);
    const escapeClearance = getMinimumClearanceRatio(escapePosition, obstacles);
    const canEscape =
      !isPositionBlocked(escapePosition, obstacles)
      || escapeClearance >= currentClearance;

    return {
      ...creature,
      position: canEscape ? escapePosition : creature.position,
      velocity: canEscape
        ? escapeVelocity
        : escapeVelocity.multiplyScalar(BLOCKED_VELOCITY_DAMPING),
      wanderDirection: escapeDirection,
      wanderTimer: createDirectionTimer(),
    };
  }

  const appliedVelocity = hitFieldEdge && delta > 0
    ? nextPosition.clone().sub(creature.position).divideScalar(delta)
    : velocity;

  return {
    ...creature,
    position: nextPosition,
    velocity: appliedVelocity,
    wanderDirection: config.nextWanderDirection,
    wanderTimer: config.nextWanderTimer,
  };
};

// 更新処理
export const updateWanderingCreature = (
  creature: CreatureState,
  creatures: CreatureState[],
  waterSources: WaterSource[],
  delta: number,
): CreatureState => {
  // 方向転換するか判断
  const shouldChangeDirection = creature.wanderTimer <= 0;
  const wanderDirection = shouldChangeDirection
    ? createRandomDirection()
    : creature.wanderDirection;
  // タイマーの更新
  const wanderTimer = shouldChangeDirection
    ? createDirectionTimer()
    : creature.wanderTimer - delta;

  return updateCreatureMovement(
    creature,
    wanderDirection,
    creatures,
    waterSources,
    delta,
    {
      nextWanderDirection: wanderDirection,
      nextWanderTimer: wanderTimer,
    },
  );
};

export const updateCreatureMovingTowardPosition = (
  creature: CreatureState,
  targetPosition: THREE.Vector3,
  creatures: CreatureState[],
  waterSources: WaterSource[],
  delta: number,
  options: MovementOptions = {},
): CreatureState => {
  const desiredDirection = targetPosition.clone().sub(creature.position);
  desiredDirection.y = 0;

  if (desiredDirection.lengthSq() === 0) {
    return {
      ...creature,
      velocity: new THREE.Vector3(0, 0, 0),
    };
  }

  return updateCreatureMovement(
    creature,
    desiredDirection.normalize(),
    creatures,
    waterSources,
    delta,
    {
      ...options,
      nextWanderDirection: creature.wanderDirection,
      nextWanderTimer: creature.wanderTimer,
    },
  );
};
