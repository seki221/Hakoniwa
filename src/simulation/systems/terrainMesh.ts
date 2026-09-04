import * as THREE from 'three';
import type { WaterSource } from '../../types/waterSource';
import {
  getTerrainGroundColor,
  getTerrainVertexHeightAtPosition,
  sampleEnvironmentAt,
} from './environment';

export {
  getTerrainHeightAtPosition,
  TERRAIN_CELL_SIZE,
  TERRAIN_MAX_HEIGHT,
  TERRAIN_MIN_HEIGHT,
  TERRAIN_SIZE,
} from './environment';

export type TerrainMeshOptions = {
  size: number;
  cellSize: number;
  minHeight: number;
  maxHeight: number;
  waterSources: WaterSource[];
};

export function createTerrainMesh(options: TerrainMeshOptions): THREE.Mesh {
  const { size, cellSize, minHeight, maxHeight, waterSources } = options;

  // 50m / 0.5m の場合、100セルになる
  const cells = Math.floor(size / cellSize);

  // 頂点数はセル数 + 1
  // 100セルなら、1辺あたり101頂点になる
  const vertexCountPerSide = cells + 1;

  const halfSize = size / 2;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // 頂点座標を作成する
  // x, z の位置に応じて y を変化させることで地形らしい凹凸を作る
  for (let zIndex = 0; zIndex < vertexCountPerSide; zIndex++) {
    for (let xIndex = 0; xIndex < vertexCountPerSide; xIndex++) {
      const x = xIndex * cellSize - halfSize;
      const z = zIndex * cellSize - halfSize;
      const y = getTerrainVertexHeightAtPosition(
        x,
        z,
        waterSources,
        minHeight,
        maxHeight,
      );
      const sample = sampleEnvironmentAt(x, z, waterSources, {
        minHeight,
        maxHeight,
        size,
        cellSize,
      });
      const color = getTerrainGroundColor(sample);

      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  }

  // 4つの頂点から2つの三角形を作成する
  for (let zIndex = 0; zIndex < cells; zIndex++) {
    for (let xIndex = 0; xIndex < cells; xIndex++) {
      const a = zIndex * vertexCountPerSide + xIndex;
      const b = a + 1;
      const c = a + vertexCountPerSide;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();

  // 頂点座標をgeometryに設定する
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3),
  );

  // 三角形を構成する頂点番号を設定する
  geometry.setIndex(indices);

  // ライトの当たり方を計算するために法線を作成する
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.0,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'TerrainMesh';

  return mesh;
}
