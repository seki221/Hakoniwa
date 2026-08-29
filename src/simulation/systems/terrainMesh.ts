import * as THREE from 'three';
import type { WaterSource } from '../../types/waterSource';

export type TerrainMeshOptions = {
  size: number;
  cellSize: number;
  minHeight: number;
  maxHeight: number;
  waterSources: WaterSource[];
};

const WATER_SHORE_BAND = 0.35;
const WATER_BANK_HEIGHT = 0.08;
const WATER_EDGE_DEPTH = 0.08;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return x * x * (3 - 2 * x);
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export const TERRAIN_MIN_HEIGHT = -0.4;
export const TERRAIN_MAX_HEIGHT = 0.6;
export const TERRAIN_SIZE = 200;
export const TERRAIN_CELL_SIZE = 2;

function generateHeight(
  x: number,
  z: number,
  minHeight: number,
  maxHeight: number,
): number {
  const wave1 = Math.sin(x * 0.25) * 0.55;
  const wave2 = Math.cos(z * 0.22) * 0.45;
  const wave3 = Math.sin((x + z) * 0.16) * 0.35;

  const height = wave1 + wave2 + wave3;

  return clamp(height, minHeight, maxHeight);
}

function getNormalizedWaterDistance(
  x: number,
  z: number,
  waterSource: WaterSource,
): number {
  const xRadius = waterSource.size[0] / 2;
  const zRadius = waterSource.size[1] / 2;
  const dx = (x - waterSource.position.x) / xRadius;
  const dz = (z - waterSource.position.z) / zRadius;

  return Math.sqrt(dx * dx + dz * dz);
}

function carveWaterDepression(
  baseHeight: number,
  x: number,
  z: number,
  waterSources: WaterSource[],
): number {
  return waterSources.reduce((height, waterSource) => {
    const distance = getNormalizedWaterDistance(x, z, waterSource);
    const waterLevel = waterSource.position.y;

    if (distance <= 1) {
      const edgeBlend = smoothstep(0.68, 1, distance);
      const bottomHeight = waterLevel - waterSource.depth;
      const edgeHeight = waterLevel - WATER_EDGE_DEPTH;

      return Math.min(height, mix(bottomHeight, edgeHeight, edgeBlend));
    }

    if (distance <= 1 + WATER_SHORE_BAND) {
      const shoreBlend = smoothstep(1, 1 + WATER_SHORE_BAND, distance);
      const bankHeight = waterLevel + WATER_BANK_HEIGHT * (1 - shoreBlend);

      return Math.max(height, bankHeight);
    }

    return height;
  }, baseHeight);
}

function getTerrainVertexHeightAtPosition(
  x: number,
  z: number,
  waterSources: WaterSource[],
  minHeight = TERRAIN_MIN_HEIGHT,
  maxHeight = TERRAIN_MAX_HEIGHT,
): number {
  return carveWaterDepression(
    generateHeight(x, z, minHeight, maxHeight),
    x,
    z,
    waterSources,
  );
}

/** Returns the same triangle-interpolated surface height that the terrain mesh renders. */
export function getTerrainHeightAtPosition(
  x: number,
  z: number,
  waterSources: WaterSource[],
  minHeight = TERRAIN_MIN_HEIGHT,
  maxHeight = TERRAIN_MAX_HEIGHT,
  size = TERRAIN_SIZE,
  cellSize = TERRAIN_CELL_SIZE,
): number {
  const halfSize = size / 2;
  const cells = Math.floor(size / cellSize);
  const gridX = clamp((x + halfSize) / cellSize, 0, cells);
  const gridZ = clamp((z + halfSize) / cellSize, 0, cells);
  const xIndex = Math.min(Math.floor(gridX), cells - 1);
  const zIndex = Math.min(Math.floor(gridZ), cells - 1);
  const x0 = xIndex * cellSize - halfSize;
  const z0 = zIndex * cellSize - halfSize;
  const tx = gridX - xIndex;
  const tz = gridZ - zIndex;

  const h00 = getTerrainVertexHeightAtPosition(x0, z0, waterSources, minHeight, maxHeight);
  const h10 = getTerrainVertexHeightAtPosition(x0 + cellSize, z0, waterSources, minHeight, maxHeight);
  const h01 = getTerrainVertexHeightAtPosition(x0, z0 + cellSize, waterSources, minHeight, maxHeight);
  const h11 = getTerrainVertexHeightAtPosition(
    x0 + cellSize,
    z0 + cellSize,
    waterSources,
    minHeight,
    maxHeight,
  );

  if (tx + tz <= 1) {
    return h00 + tx * (h10 - h00) + tz * (h01 - h00);
  }

  return h11 + (1 - tx) * (h01 - h11) + (1 - tz) * (h10 - h11);
}

export function createTerrainMesh(options: TerrainMeshOptions): THREE.Mesh {
  const { size, cellSize, minHeight, maxHeight, waterSources } = options;

  // 50m / 0.5m の場合、100セルになる
  const cells = Math.floor(size / cellSize);

  // 頂点数はセル数 + 1
  // 100セルなら、1辺あたり101頂点になる
  const vertexCountPerSide = cells + 1;

  const halfSize = size / 2;

  const positions: number[] = [];
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

      positions.push(x, y, z);
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

  // 三角形を構成する頂点番号を設定する
  geometry.setIndex(indices);

  // ライトの当たり方を計算するために法線を作成する
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x9bd37f,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'TerrainMesh';

  return mesh;
}
