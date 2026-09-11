import * as THREE from 'three';

export type WaterSourceState = 'CLEAN' | 'POLLUTED' | 'DRY';
export type WaterTerrainKind = 'POND' | 'RIVER' | 'MARSH';
export type WaterBasinState = 'STABLE' | 'DRY';

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export const isDrinkableWaterSource = (
  waterSource: WaterSource,
): boolean =>
  waterSource.amount > 0
  && waterSource.state === 'CLEAN';

export const isActiveWaterSource = (
  waterSource: WaterSource,
): boolean =>
  waterSource.amount > 0
  && waterSource.state !== 'DRY';

export const getWaterFillRatio = (
  waterSource: WaterSource,
): number => {
  if (waterSource.capacity <= 0) {
    return 0;
  }

  return clamp01(waterSource.amount / waterSource.capacity);
};

export const getWaterSurfaceY = (
  waterSource: WaterSource,
  basin: WaterBasin,
): number =>
  basin.position.y - basin.depth * (1 - getWaterFillRatio(waterSource)) * 0.55;

export const getWaterBasinBySource = (
  waterSource: WaterSource,
  waterBasins: WaterBasin[],
): WaterBasin | null =>
  waterBasins.find((basin) => basin.id === waterSource.basinId) ?? null;

export type WaterBasin = {
  id: string;
  name: string;
  position: THREE.Vector3;
  size: [number, number];
  /** 地形としての水場分類。穴の形、深さ、歩けるかどうかに影響する。 */
  terrainKind: WaterTerrainKind;
  depth: number;
  rimHeight: number;
  type: 'WATERBASIN';
  capacity: number;
  state: WaterBasinState;
};

export type WaterSource = {
  id: string;
  name: string;
  basinId: string;
  /** capacity は対応する basin の最大水量、amount は現在水量。 */
  type: 'WATERSOURCE';
  capacity: number;
  amount: number;
  state: WaterSourceState;
};
