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
      const y = carveWaterDepression(
        generateHeight(x, z, minHeight, maxHeight),
        x,
        z,
        waterSources,
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
