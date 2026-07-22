import * as THREE from 'three';

export type CreatureFaction = 'GREEN' | 'RED' | 'BLUE';
export type CreatureBehaviorState = 'WANDERING' | 'HEADING_TO_WATER';

export type CreatureState = {
  id: string;
  name: string;
  position: THREE.Vector3;
  wanderDirection: THREE.Vector3;
  wanderTimer: number;
  type: 'CREATURE';
  hp: number;
  thirst: number;
  hunger: number;
  affiliation: CreatureFaction;
  state: CreatureBehaviorState;
};