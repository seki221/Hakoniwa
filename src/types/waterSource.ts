import * as THREE from 'three';

export type WaterSourceState = 'CLEAN' | 'POLLUTION' | 'DRY';
export type WaterTerrainKind = 'POND' | 'RIVER' | 'MARSH';

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
