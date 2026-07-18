import * as THREE from 'three';
export type Watersourcetype = {
  id: string;
  name: string;
  position: THREE.Vector3;
  size: [number, number];
  type: 'WATERSOURCE';
  amount: number;
  state: 'CLEAN' | 'POLLUTION' | 'DRY';
};