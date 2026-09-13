import * as THREE from 'three';
import type { WaterBasin } from '../../types/waterSource';
import {
  getDeterministicUnitValue,
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
  waterBasins: WaterBasin[];
};

const TERRAIN_BEDROCK_CLEARANCE = 12;
const WATER_BASIN_BEDROCK_CLEARANCE = 0.8;
const SOIL_SIDE_COLOR = new THREE.Color('#5d633f');
const SOIL_BOTTOM_COLOR = new THREE.Color('#3d402c');

const getTerrainBaseHeight = (
  minHeight: number,
  waterBasins: WaterBasin[],
): number => {
  const lowestBasinBottom = waterBasins.reduce((lowest, waterBasin) =>
    Math.min(lowest, waterBasin.position.y - waterBasin.depth),
  Number.POSITIVE_INFINITY);
  const baseFromTerrain = minHeight - TERRAIN_BEDROCK_CLEARANCE;

  if (!Number.isFinite(lowestBasinBottom)) {
    return baseFromTerrain;
  }

  return Math.min(baseFromTerrain, lowestBasinBottom - WATER_BASIN_BEDROCK_CLEARANCE);
};

const getSoilColor = (
  x: number,
  z: number,
  depthRatio: number,
): THREE.Color => {
  const color = SOIL_SIDE_COLOR.clone().lerp(SOIL_BOTTOM_COLOR, depthRatio);
  const variation = getDeterministicUnitValue(x, z, 307);

  color.offsetHSL(0, 0, (variation - 0.5) * 0.045);

  return color;
};

export function createTerrainMesh(options: TerrainMeshOptions): THREE.Mesh {
  const { size, cellSize, minHeight, maxHeight, waterBasins } = options;

  // 50m / 0.5m の場合、100セルになる
  const cells = Math.floor(size / cellSize);

  // 頂点数はセル数 + 1
  // 100セルなら、1辺あたり101頂点になる
  const vertexCountPerSide = cells + 1;

  const halfSize = size / 2;
  const baseHeight = getTerrainBaseHeight(minHeight, waterBasins);

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const topVertexIndices: number[][] = [];
  const bottomVertexIndices: number[][] = [];
  const topColors: THREE.Color[][] = [];

  const pushVertex = (x: number, y: number, z: number, color: THREE.Color): number => {
    const index = positions.length / 3;

    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);

    return index;
  };

  // 頂点座標を作成する
  // x, z の位置に応じて y を変化させることで地形らしい凹凸を作る
  for (let zIndex = 0; zIndex < vertexCountPerSide; zIndex++) {
    topVertexIndices[zIndex] = [];
    topColors[zIndex] = [];

    for (let xIndex = 0; xIndex < vertexCountPerSide; xIndex++) {
      const x = xIndex * cellSize - halfSize;
      const z = zIndex * cellSize - halfSize;
      const y = getTerrainVertexHeightAtPosition(
        x,
        z,
        waterBasins,
        minHeight,
        maxHeight,
      );
      const sample = sampleEnvironmentAt(x, z, waterBasins, {
        minHeight,
        maxHeight,
        size,
        cellSize,
      });
      const color = getTerrainGroundColor(sample);

      topVertexIndices[zIndex][xIndex] = pushVertex(x, y, z, color);
      topColors[zIndex][xIndex] = color;
    }
  }

  // 地表面を作成する
  for (let zIndex = 0; zIndex < cells; zIndex++) {
    for (let xIndex = 0; xIndex < cells; xIndex++) {
      const a = topVertexIndices[zIndex][xIndex];
      const b = topVertexIndices[zIndex][xIndex + 1];
      const c = topVertexIndices[zIndex + 1][xIndex];
      const d = topVertexIndices[zIndex + 1][xIndex + 1];

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // 地中の底面を作成する。上面とは別頂点にして、法線が混ざらないようにする。
  for (let zIndex = 0; zIndex < vertexCountPerSide; zIndex++) {
    bottomVertexIndices[zIndex] = [];

    for (let xIndex = 0; xIndex < vertexCountPerSide; xIndex++) {
      const x = xIndex * cellSize - halfSize;
      const z = zIndex * cellSize - halfSize;

      bottomVertexIndices[zIndex][xIndex] = pushVertex(
        x,
        baseHeight,
        z,
        getSoilColor(x, z, 1),
      );
    }
  }

  for (let zIndex = 0; zIndex < cells; zIndex++) {
    for (let xIndex = 0; xIndex < cells; xIndex++) {
      const a = bottomVertexIndices[zIndex][xIndex];
      const b = bottomVertexIndices[zIndex][xIndex + 1];
      const c = bottomVertexIndices[zIndex + 1][xIndex];
      const d = bottomVertexIndices[zIndex + 1][xIndex + 1];

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const addTerrainSideQuad = (
    topA: THREE.Vector3,
    topB: THREE.Vector3,
    bottomA: THREE.Vector3,
    bottomB: THREE.Vector3,
    topColorA: THREE.Color,
    topColorB: THREE.Color,
    winding: 'negativeZ' | 'positiveZ' | 'negativeX' | 'positiveX',
  ): void => {
    const a = pushVertex(
      topA.x,
      topA.y,
      topA.z,
      topColorA.clone().lerp(SOIL_SIDE_COLOR, 0.45),
    );
    const b = pushVertex(
      topB.x,
      topB.y,
      topB.z,
      topColorB.clone().lerp(SOIL_SIDE_COLOR, 0.45),
    );
    const c = pushVertex(
      bottomA.x,
      bottomA.y,
      bottomA.z,
      getSoilColor(bottomA.x, bottomA.z, 1),
    );
    const d = pushVertex(
      bottomB.x,
      bottomB.y,
      bottomB.z,
      getSoilColor(bottomB.x, bottomB.z, 1),
    );

    if (winding === 'negativeZ' || winding === 'positiveX') {
      indices.push(a, b, c);
      indices.push(b, d, c);
      return;
    }

    indices.push(a, c, b);
    indices.push(b, c, d);
  };

  for (let xIndex = 0; xIndex < cells; xIndex++) {
    const x0 = xIndex * cellSize - halfSize;
    const x1 = (xIndex + 1) * cellSize - halfSize;
    const northTopAIndex = topVertexIndices[0][xIndex];
    const northTopBIndex = topVertexIndices[0][xIndex + 1];
    const southTopAIndex = topVertexIndices[cells][xIndex];
    const southTopBIndex = topVertexIndices[cells][xIndex + 1];
    const northY0 = positions[northTopAIndex * 3 + 1];
    const northY1 = positions[northTopBIndex * 3 + 1];
    const southY0 = positions[southTopAIndex * 3 + 1];
    const southY1 = positions[southTopBIndex * 3 + 1];

    addTerrainSideQuad(
      new THREE.Vector3(x0, northY0, -halfSize),
      new THREE.Vector3(x1, northY1, -halfSize),
      new THREE.Vector3(x0, baseHeight, -halfSize),
      new THREE.Vector3(x1, baseHeight, -halfSize),
      topColors[0][xIndex],
      topColors[0][xIndex + 1],
      'negativeZ',
    );
    addTerrainSideQuad(
      new THREE.Vector3(x0, southY0, halfSize),
      new THREE.Vector3(x1, southY1, halfSize),
      new THREE.Vector3(x0, baseHeight, halfSize),
      new THREE.Vector3(x1, baseHeight, halfSize),
      topColors[cells][xIndex],
      topColors[cells][xIndex + 1],
      'positiveZ',
    );
  }

  for (let zIndex = 0; zIndex < cells; zIndex++) {
    const z0 = zIndex * cellSize - halfSize;
    const z1 = (zIndex + 1) * cellSize - halfSize;
    const westTopAIndex = topVertexIndices[zIndex][0];
    const westTopBIndex = topVertexIndices[zIndex + 1][0];
    const eastTopAIndex = topVertexIndices[zIndex][cells];
    const eastTopBIndex = topVertexIndices[zIndex + 1][cells];
    const westY0 = positions[westTopAIndex * 3 + 1];
    const westY1 = positions[westTopBIndex * 3 + 1];
    const eastY0 = positions[eastTopAIndex * 3 + 1];
    const eastY1 = positions[eastTopBIndex * 3 + 1];

    addTerrainSideQuad(
      new THREE.Vector3(-halfSize, westY0, z0),
      new THREE.Vector3(-halfSize, westY1, z1),
      new THREE.Vector3(-halfSize, baseHeight, z0),
      new THREE.Vector3(-halfSize, baseHeight, z1),
      topColors[zIndex][0],
      topColors[zIndex + 1][0],
      'negativeX',
    );
    addTerrainSideQuad(
      new THREE.Vector3(halfSize, eastY0, z0),
      new THREE.Vector3(halfSize, eastY1, z1),
      new THREE.Vector3(halfSize, baseHeight, z0),
      new THREE.Vector3(halfSize, baseHeight, z1),
      topColors[zIndex][cells],
      topColors[zIndex + 1][cells],
      'positiveX',
    );
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
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'TerrainMesh';

  return mesh;
}
