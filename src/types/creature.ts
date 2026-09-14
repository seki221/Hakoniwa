import * as THREE from 'three';

export type CreatureFaction = 'GREEN' | 'RED' | 'BLUE';
export type CreatureSex = 'FEMALE' | 'MALE';
export type CreatureBehaviorState =
  | 'WANDERING'
  | 'HEADING_TO_WATER'
  | 'DRINKING'
  | 'HEADING_TO_FOOD'
  | 'EATING'
  | 'RESTING';

export type CreatureStaminaProfile = {
  maxStamina: number;
  forcedRestRatio: number;
  restedRatio: number;
  daytimeDistanceCost: number;
  daytimeSpeedCost: number;
  nightRecoveryRate: number;
  restRecoveryRate: number;
};

export type CreatureState = {
  id: string;
  name: string;
  /*集落情報 */
  settlementid: string;
  homeid: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  wanderDirection: THREE.Vector3;
  wanderTimer: number;
  targetWaterSourceId: string | null;
  targetFoodId: string | null;
  type: 'CREATURE';
  hp: number;
  stamina: number;
  staminaProfile: CreatureStaminaProfile;
  thirst: number;
  hunger: number;
  affiliation: CreatureFaction;
  state: CreatureBehaviorState;
  age: number;
  lifeExpectancy: number;
  generation: number;
  parentIds: string[];
  sex: CreatureSex;
  partnerId: string | null;
  reproductionTimer: number;
};

export type ResourceInformation = {
  id: string;
  resourceId: string;
  discoveredAt: number;
  expiresAt: number;
};
