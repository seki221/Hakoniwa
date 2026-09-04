import * as THREE from 'three';
import type { WaterSource } from '../../types/waterSource';

export type EnvironmentSamplingOptions = {
  minHeight?: number;
  maxHeight?: number;
  size?: number;
  cellSize?: number;
};

export type EnvironmentSample = {
  height: number;
  normalizedHeight: number;
  normal: THREE.Vector3;
  slope: number;
  moisture: number;
  fertility: number;
  grassDensity: number;
  isWater: boolean;
  isLand: boolean;
  waterInfluence: number;
};

export const TERRAIN_MIN_HEIGHT = -0.4;
export const TERRAIN_MAX_HEIGHT = 0.6;
export const TERRAIN_SIZE = 200;
export const TERRAIN_CELL_SIZE = 2;

const WATER_SHORE_BAND = 0.35;
const WATER_BANK_HEIGHT = 0.08;
const WATER_EDGE_DEPTH = 0.08;
const NORMAL_SAMPLE_STEP = 0.75;

const LOW_GROUND_COLOR = new THREE.Color('#7f9d5c');
const HIGH_GROUND_COLOR = new THREE.Color('#a6bf7a');
const DAMP_GROUND_COLOR = new THREE.Color('#5f8f52');
const SLOPE_GROUND_COLOR = new THREE.Color('#798754');
const GRASS_RICH_COLOR = new THREE.Color('#8fbd64');

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return x * x * (3 - 2 * x);
}

export function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function getDeterministicUnitValue(
  x: number,
  z: number,
  seed = 0,
): number {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;

  return value - Math.floor(value);
}

function getValueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const sx = smoothstep(0, 1, tx);
  const sz = smoothstep(0, 1, tz);
  const n00 = getDeterministicUnitValue(x0, z0, seed);
  const n10 = getDeterministicUnitValue(x0 + 1, z0, seed);
  const n01 = getDeterministicUnitValue(x0, z0 + 1, seed);
  const n11 = getDeterministicUnitValue(x0 + 1, z0 + 1, seed);
  const nx0 = mix(n00, n10, sx);
  const nx1 = mix(n01, n11, sx);

  return mix(nx0, nx1, sz);
}

function getFractalNoise(x: number, z: number, seed: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let octave = 0; octave < 4; octave += 1) {
    value += getValueNoise(x * frequency, z * frequency, seed + octave) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

function generateBaseTerrainHeight(
  x: number,
  z: number,
  minHeight: number,
  maxHeight: number,
): number {
  const wave1 = Math.sin(x * 0.25) * 0.42;
  const wave2 = Math.cos(z * 0.22) * 0.34;
  const wave3 = Math.sin((x + z) * 0.16) * 0.26;
  const broadNoise = (getFractalNoise(x * 0.055, z * 0.055, 11) - 0.5) * 0.42;
  const detailNoise = (getFractalNoise(x * 0.18, z * 0.18, 37) - 0.5) * 0.08;

  return clamp(wave1 + wave2 + wave3 + broadNoise + detailNoise, minHeight, maxHeight);
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

function getNearestWaterDistance(
  x: number,
  z: number,
  waterSources: WaterSource[],
): number {
  if (waterSources.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return waterSources.reduce((nearestDistance, waterSource) =>
    Math.min(nearestDistance, getNormalizedWaterDistance(x, z, waterSource)),
  Number.POSITIVE_INFINITY);
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

export function getTerrainVertexHeightAtPosition(
  x: number,
  z: number,
  waterSources: WaterSource[],
  minHeight = TERRAIN_MIN_HEIGHT,
  maxHeight = TERRAIN_MAX_HEIGHT,
): number {
  return carveWaterDepression(
    generateBaseTerrainHeight(x, z, minHeight, maxHeight),
    x,
    z,
    waterSources,
  );
}

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
  const h10 = getTerrainVertexHeightAtPosition(
    x0 + cellSize,
    z0,
    waterSources,
    minHeight,
    maxHeight,
  );
  const h01 = getTerrainVertexHeightAtPosition(
    x0,
    z0 + cellSize,
    waterSources,
    minHeight,
    maxHeight,
  );
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

function getTerrainNormalAtPosition(
  x: number,
  z: number,
  waterSources: WaterSource[],
  options: Required<EnvironmentSamplingOptions>,
): THREE.Vector3 {
  const left = getTerrainHeightAtPosition(
    x - NORMAL_SAMPLE_STEP,
    z,
    waterSources,
    options.minHeight,
    options.maxHeight,
    options.size,
    options.cellSize,
  );
  const right = getTerrainHeightAtPosition(
    x + NORMAL_SAMPLE_STEP,
    z,
    waterSources,
    options.minHeight,
    options.maxHeight,
    options.size,
    options.cellSize,
  );
  const down = getTerrainHeightAtPosition(
    x,
    z - NORMAL_SAMPLE_STEP,
    waterSources,
    options.minHeight,
    options.maxHeight,
    options.size,
    options.cellSize,
  );
  const up = getTerrainHeightAtPosition(
    x,
    z + NORMAL_SAMPLE_STEP,
    waterSources,
    options.minHeight,
    options.maxHeight,
    options.size,
    options.cellSize,
  );
  const dx = (right - left) / (NORMAL_SAMPLE_STEP * 2);
  const dz = (up - down) / (NORMAL_SAMPLE_STEP * 2);

  return new THREE.Vector3(-dx, 1, -dz).normalize();
}

function getRequiredOptions(
  options: EnvironmentSamplingOptions = {},
): Required<EnvironmentSamplingOptions> {
  return {
    minHeight: options.minHeight ?? TERRAIN_MIN_HEIGHT,
    maxHeight: options.maxHeight ?? TERRAIN_MAX_HEIGHT,
    size: options.size ?? TERRAIN_SIZE,
    cellSize: options.cellSize ?? TERRAIN_CELL_SIZE,
  };
}

export function sampleEnvironmentAt(
  x: number,
  z: number,
  waterSources: WaterSource[],
  options: EnvironmentSamplingOptions = {},
): EnvironmentSample {
  const requiredOptions = getRequiredOptions(options);
  const height = getTerrainHeightAtPosition(
    x,
    z,
    waterSources,
    requiredOptions.minHeight,
    requiredOptions.maxHeight,
    requiredOptions.size,
    requiredOptions.cellSize,
  );
  const normal = getTerrainNormalAtPosition(x, z, waterSources, requiredOptions);
  const normalizedHeight = clamp(
    (height - requiredOptions.minHeight)
      / (requiredOptions.maxHeight - requiredOptions.minHeight),
    0,
    1,
  );
  const nearestWaterDistance = getNearestWaterDistance(x, z, waterSources);
  const isWater = nearestWaterDistance <= 1;
  const waterInfluence =
    Number.isFinite(nearestWaterDistance)
      ? 1 - smoothstep(1, 2.4, nearestWaterDistance)
      : 0;
  const slope = clamp((Math.acos(clamp(normal.y, 0, 1)) / (Math.PI / 2)) * 1.8, 0, 1);
  const lowlandMoisture = (1 - normalizedHeight) * 0.28;
  const localMoisture = (getFractalNoise(x * 0.08, z * 0.08, 73) - 0.5) * 0.18;
  const moisture = clamp(0.28 + lowlandMoisture + waterInfluence * 0.45 + localMoisture, 0, 1);
  const fertilityNoise = (getFractalNoise(x * 0.12, z * 0.12, 97) - 0.5) * 0.24;
  const fertility = clamp(0.42 + moisture * 0.34 - slope * 0.22 + fertilityNoise, 0, 1);
  const patchNoise = getFractalNoise(x * 0.32, z * 0.32, 131);
  const patchAmount = smoothstep(0.34, 0.72, patchNoise);
  const slopePenalty = 1 - smoothstep(0.45, 0.95, slope) * 0.7;
  const grassDensity = isWater
    ? 0
    : clamp(fertility * patchAmount * slopePenalty, 0, 1);

  return {
    height,
    normalizedHeight,
    normal,
    slope,
    moisture,
    fertility,
    grassDensity,
    isWater,
    isLand: !isWater,
    waterInfluence,
  };
}

export function getTerrainGroundColor(sample: EnvironmentSample): THREE.Color {
  const color = LOW_GROUND_COLOR.clone().lerp(HIGH_GROUND_COLOR, sample.normalizedHeight);
  const detail = getDeterministicUnitValue(
    sample.height * 31.7,
    sample.moisture * 47.3,
    149,
  );

  color.lerp(DAMP_GROUND_COLOR, sample.moisture * 0.28);
  color.lerp(SLOPE_GROUND_COLOR, sample.slope * 0.32);
  color.lerp(GRASS_RICH_COLOR, sample.grassDensity * 0.18);
  color.offsetHSL(0, 0, (detail - 0.5) * 0.055);

  return color;
}
