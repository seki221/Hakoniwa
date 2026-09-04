import * as THREE from 'three';
import type { WaterSource } from '../../types/waterSource';
import { getTerrainHeightAtPosition } from './environment';

export const FIELD_LIMIT = 20;
export const CREATURE_RADIUS = 0.6;
export const CREATURE_TERRAIN_CLEARANCE = 0.02;
export const WATER_SOURCE_CLEARANCE = 0.25;
export const CREATURE_GROUND_Y = CREATURE_RADIUS;

export const getXZDistance = (
  position: THREE.Vector3,
  target: THREE.Vector3,
): number => {
  const dx = position.x - target.x;
  const dz = position.z - target.z;

  return Math.sqrt(dx * dx + dz * dz);
};

export const getWaterSourceRadius = (
  waterSource: WaterSource,
): number =>
  Math.max(...waterSource.size) / 2;

export const getWaterSourceInteractionDistance = (
  waterSource: WaterSource,
): number =>
  getWaterSourceRadius(waterSource) + CREATURE_RADIUS + WATER_SOURCE_CLEARANCE;

export const isInsideWaterSource = (
  position: THREE.Vector3,
  waterSource: WaterSource,
): boolean =>
  getXZDistance(position, waterSource.position) < getWaterSourceRadius(waterSource);

/** 水面に入った個体を浮かせず、浅瀬では身体の半分ほどを水面下へ沈める。 */
export const getCreatureHeightAtPosition = (
  position: THREE.Vector3,
  waterSources: WaterSource[],
): number => {
  const waterSource = waterSources.find((water) => isInsideWaterSource(position, water));

  if (!waterSource) {
    return getTerrainHeightAtPosition(position.x, position.z, waterSources)
      + CREATURE_RADIUS
      + CREATURE_TERRAIN_CLEARANCE;
  }

  const visibleHeight = Math.min(CREATURE_RADIUS * 0.45, waterSource.depth);
  return waterSource.position.y + visibleHeight;
};
