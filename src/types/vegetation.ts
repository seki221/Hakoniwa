import type * as THREE from 'three';

export type GrassBlade = {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  height: number;
  width: number;
  rotationY: number;
  lean: number;
  color: string;
  swayPhase: number;
  swayStrength: number;
  isEdible: boolean;
  regrowthRemaining: number;
};

export type PlantFood = {
  id: string;
  position: THREE.Vector3;
  color: string;
  nutrition: number;
  isAvailable: boolean;
  regrowthRemaining: number;
};
