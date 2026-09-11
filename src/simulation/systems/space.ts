import * as THREE from 'three';
import {
  getWaterBasinBySource,
  getWaterSurfaceY,
  isActiveWaterSource,
  type WaterBasin,
  type WaterSource,
} from '../../types/waterSource';
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

export const getWaterBasinRadius = (
  waterBasin: WaterBasin,
): number =>
  Math.max(...waterBasin.size) / 2;

export const getWaterBasinInteractionDistance = (
  waterBasin: WaterBasin,
): number =>
  getWaterBasinRadius(waterBasin) + CREATURE_RADIUS + WATER_SOURCE_CLEARANCE;

export const isInsideWaterBasin = (
  position: THREE.Vector3,
  waterBasin: WaterBasin,
): boolean =>
  getXZDistance(position, waterBasin.position) < getWaterBasinRadius(waterBasin);

const getActiveWaterBasinAtPosition = (
  position: THREE.Vector3,
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
): { basin: WaterBasin; source: WaterSource } | null => {
  for (const waterSource of waterSources) {
    if (!isActiveWaterSource(waterSource)) {
      continue;
    }

    const waterBasin = getWaterBasinBySource(waterSource, waterBasins);

    if (waterBasin && isInsideWaterBasin(position, waterBasin)) {
      return {
        basin: waterBasin,
        source: waterSource,
      };
    }
  }

  return null;
};

export const isInsideActiveWaterSource = (
  position: THREE.Vector3,
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
): boolean =>
  getActiveWaterBasinAtPosition(position, waterBasins, waterSources) !== null;

/** 水面に入った個体を浮かせず、浅瀬では身体の半分ほどを水面下へ沈める。 */
export const getCreatureHeightAtPosition = (
  position: THREE.Vector3,
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
): number => {
  const activeWater = getActiveWaterBasinAtPosition(position, waterBasins, waterSources);

  if (!activeWater) {
    return getTerrainHeightAtPosition(position.x, position.z, waterBasins)
      + CREATURE_RADIUS
      + CREATURE_TERRAIN_CLEARANCE;
  }

  const visibleHeight = Math.min(CREATURE_RADIUS * 0.45, activeWater.basin.depth);

  return getWaterSurfaceY(activeWater.source, activeWater.basin) + visibleHeight;
};
