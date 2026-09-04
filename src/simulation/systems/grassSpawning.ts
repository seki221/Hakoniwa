import * as THREE from 'three';
import type { GrassBlade } from '../../types/vegetation';
import type { WaterSource } from '../../types/waterSource';
import {
  clamp,
  getDeterministicUnitValue,
  mix,
  sampleEnvironmentAt,
} from './environment';
import { FIELD_LIMIT } from './space';

const GRASS_FIELD_LIMIT = FIELD_LIMIT + 8;
const GRASS_CELL_SIZE = 1;
const GRASS_ROOT_CLEARANCE = 0.015;
const MIN_PATCH_DENSITY = 0.32;
const MAX_BLADES_PER_PATCH = 6;

const DRY_GRASS_COLOR = new THREE.Color('#9cad62');
const FRESH_GRASS_COLOR = new THREE.Color('#6fa348');
const DAMP_GRASS_COLOR = new THREE.Color('#4f7f43');

const getCellRandom = (
  xIndex: number,
  zIndex: number,
  seed: number,
): number =>
  getDeterministicUnitValue(xIndex * 13.17, zIndex * 19.91, seed);

const getGrassColor = (
  moisture: number,
  density: number,
  variation: number,
): string => {
  const color = DRY_GRASS_COLOR.clone().lerp(FRESH_GRASS_COLOR, density);

  color.lerp(DAMP_GRASS_COLOR, moisture * 0.45);
  color.offsetHSL(0, 0, (variation - 0.5) * 0.08);

  return color.getStyle();
};

const getPatchBladeCount = (
  density: number,
  randomValue: number,
): number => {
  const count = 2 + Math.floor(density * MAX_BLADES_PER_PATCH + randomValue * 2);

  return Math.max(2, Math.min(MAX_BLADES_PER_PATCH, count));
};

const createGrassBlade = (
  patchId: string,
  bladeIndex: number,
  x: number,
  z: number,
  waterSources: WaterSource[],
): GrassBlade | null => {
  const sample = sampleEnvironmentAt(x, z, waterSources);

  if (!sample.isLand || sample.grassDensity < MIN_PATCH_DENSITY * 0.65) {
    return null;
  }

  const randomBase = getDeterministicUnitValue(x, z, bladeIndex + 211);
  const heightNoise = getDeterministicUnitValue(x, z, bladeIndex + 223);
  const widthNoise = getDeterministicUnitValue(x, z, bladeIndex + 227);
  const leanNoise = getDeterministicUnitValue(x, z, bladeIndex + 229);
  const colorNoise = getDeterministicUnitValue(x, z, bladeIndex + 233);
  const height = mix(0.124, 0.72, sample.grassDensity * 0.55 + heightNoise * 0.45);
  const width = mix(0.035, 0.075, widthNoise);

  return {
    id: `${patchId}_blade_${bladeIndex}`,
    position: new THREE.Vector3(x, sample.height + GRASS_ROOT_CLEARANCE, z),
    normal: sample.normal.clone(),
    height,
    width,
    rotationY: randomBase * Math.PI * 2,
    lean: mix(0.03, 0.2, leanNoise),
    color: getGrassColor(sample.moisture, sample.grassDensity, colorNoise),
    swayPhase: randomBase * Math.PI * 2,
    swayStrength: mix(0.2, 0.75, sample.grassDensity),
  };
};

export const createInitialGrassBlades = (
  waterSources: WaterSource[],
): GrassBlade[] => {
  const grassBlades: GrassBlade[] = [];
  const start = -GRASS_FIELD_LIMIT;
  const cellsPerSide = Math.floor((GRASS_FIELD_LIMIT * 2) / GRASS_CELL_SIZE);

  for (let zIndex = 0; zIndex < cellsPerSide; zIndex += 1) {
    for (let xIndex = 0; xIndex < cellsPerSide; xIndex += 1) {
      const cellX = start + xIndex * GRASS_CELL_SIZE;
      const cellZ = start + zIndex * GRASS_CELL_SIZE;
      const centerX = cellX + GRASS_CELL_SIZE * 0.5;
      const centerZ = cellZ + GRASS_CELL_SIZE * 0.5;
      const sample = sampleEnvironmentAt(centerX, centerZ, waterSources);
      const patchRoll = getCellRandom(xIndex, zIndex, 251);

      if (!sample.isLand || sample.grassDensity < MIN_PATCH_DENSITY) {
        continue;
      }

      if (patchRoll > sample.grassDensity * 0.92) {
        continue;
      }

      const patchId = `grass_patch_${xIndex}_${zIndex}`;
      const bladeCount = getPatchBladeCount(
        sample.grassDensity,
        getCellRandom(xIndex, zIndex, 257),
      );

      for (let bladeIndex = 0; bladeIndex < bladeCount; bladeIndex += 1) {
        const offsetSeed = bladeIndex * 17;
        const offsetX = (getCellRandom(xIndex, zIndex, 263 + offsetSeed) - 0.5)
          * GRASS_CELL_SIZE
          * 0.82;
        const offsetZ = (getCellRandom(xIndex, zIndex, 269 + offsetSeed) - 0.5)
          * GRASS_CELL_SIZE
          * 0.82;
        const bladeX = clamp(centerX + offsetX, -GRASS_FIELD_LIMIT, GRASS_FIELD_LIMIT);
        const bladeZ = clamp(centerZ + offsetZ, -GRASS_FIELD_LIMIT, GRASS_FIELD_LIMIT);
        const blade = createGrassBlade(patchId, bladeIndex, bladeX, bladeZ, waterSources);

        if (blade) {
          grassBlades.push(blade);
        }
      }
    }
  }

  return grassBlades;
};
