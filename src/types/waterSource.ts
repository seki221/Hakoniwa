import * as THREE from 'three';

export type WaterSourceState = 'CLEAN' | 'POLLUTION' | 'DRY';

export type WaterSource = {
  id: string;
  name: string;
  position: THREE.Vector3;
  size: [number, number];
  type: 'WATERSOURCE';
  amount: number;
  state: WaterSourceState;
};