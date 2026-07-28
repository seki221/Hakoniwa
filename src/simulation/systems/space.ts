import * as THREE from 'three';
import type { WaterSource } from '../../types/waterSource';

export const FIELD_LIMIT = 7;
export const CREATURE_RADIUS = 0.3;
export const WATER_SOURCE_CLEARANCE = 0.25;

export const getXZDistance = (
  position: THREE.Vector3,
  target: THREE.Vector3,
): number => {
  const dx = position.x - target.x;
  const dz = position.z - target.z;

  return Math.sqrt(dx * dx + dz * dz);
};

export const getWaterSourceInteractionDistance = (
  waterSource: WaterSource,
): number =>
  Math.max(...waterSource.size) / 2 + CREATURE_RADIUS + WATER_SOURCE_CLEARANCE;
