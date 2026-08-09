import * as THREE from 'three';

export type WaterSourceState = 'CLEAN' | 'POLLUTED' | 'DRY';
export type WaterTerrainKind = 'POND' | 'RIVER' | 'MARSH';

export const isDrinkableWaterSource = (
  waterSource: WaterSource,
): boolean =>
  waterSource.amount > 0
  && waterSource.state === 'CLEAN'
  && (
    waterSource.terrainKind === 'POND'
    || waterSource.terrainKind === 'RIVER'
  );

export type WaterSource = {
  id: string;
  name: string;
  position: THREE.Vector3;
  size: [number, number];
  /** 水域の地形分類。amount は将来の水循環で増減する現在水量。 */
  terrainKind: WaterTerrainKind;
  depth: number;
  type: 'WATERSOURCE';
  amount: number;
  state: WaterSourceState;
};
