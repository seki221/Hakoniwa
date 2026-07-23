import * as THREE from 'three';
import type { CreatureState } from '../../types/creature';
import type { WaterSource } from '../../types/waterSource';
import { isTooClose } from './spawning';

// 探索領域
const FIELD_LIMIT = 7;
// 生物間の隙間
const CREATURE_MIN_SPACING = 1;
// 基本探索速度
const BASE_WANDER_SPEED = 1.4;
// 目標速度へどれくらい素早く近づくか。大きいほどキビキビ、小さいほどヌルっと動く。
const STEERING_SMOOTHING = 1.5;
// 障害物や端にぶつかりそうな時に速度をどれくらい落とすか。
const BLOCKED_VELOCITY_DAMPING = 0.1;
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

// 衝突対象を集める処理
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
  // 脱水による速度調整
  const speedMultiplier = creature.thirst >= DEHYDRATED_THIRST
    ? DEHYDRATED_SPEED_MULTIPLIER
    : NORMAL_SPEED_MULTIPLIER;
  // 目標速度。いきなりこの速度にせず、下のlerpで現在速度から徐々に近づける。
  const desiredVelocity = wanderDirection
    .clone()
    .multiplyScalar(BASE_WANDER_SPEED * speedMultiplier);
  const steeringAmount = 1 - Math.exp(-STEERING_SMOOTHING * delta);
  const velocity = creature.velocity.clone().lerp(desiredVelocity, steeringAmount);
  // 次の位置を計算
  const rawNextPosition = creature.position.clone().add(velocity.clone().multiplyScalar(delta));
  const nextPosition = clampToField(rawNextPosition);
  const hitFieldEdge = !nextPosition.equals(rawNextPosition);
  // 衝突判定
  const blockedPositions = getBlockedPositions(creature, creatures, waterSources);
  const isBlocked = blockedPositions.some((position) =>
    isTooClose(nextPosition, position, CREATURE_MIN_SPACING),
  );

  if (isBlocked || hitFieldEdge) {
    return {
      ...creature,
      velocity: velocity.multiplyScalar(BLOCKED_VELOCITY_DAMPING),
      wanderDirection: createRandomDirection(),
      wanderTimer: createDirectionTimer(),
    };
  }

  return {
    ...creature,
    position: nextPosition,
    velocity,
    wanderDirection,
    wanderTimer,
  };
};
