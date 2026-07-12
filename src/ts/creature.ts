
import * as THREE from 'three';
export type Creature = {
  id: string;
  name: string;
  position: THREE.Vector3;
  type: 'CREATURE';
  hp: number;
  hunger: number;
  class: 'GREEN' | 'RED' | 'BLUE';
  state: 'WANDERING' | 'HEADING_TO_WATER';
};