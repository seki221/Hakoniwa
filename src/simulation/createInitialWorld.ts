import * as THREE from 'three';
import type { CreatureState } from '../types/creature';
import type { WaterSource } from '../types/waterSource';
import type { WorldState } from '../types/world';
import {
  createInitialWanderDirection,
  createInitialWanderTimer,
} from './systems/movement';
import { findSpawnPosition } from './systems/spawning';

const FIELD_LIMIT = 7;
const MIN_SPACING = 2.5;
const MAX_ATTEMPTS = 100;
const CREATURE_COUNT = 20;
const WATER_SOURCE_COUNT = 3;

const createWaterSources = (): WaterSource[] => {
  const waterSources: WaterSource[] = [];
  const occupiedPositions: THREE.Vector3[] = [];

  for (let i = 0; i < WATER_SOURCE_COUNT; i++) {
    const position = findSpawnPosition(occupiedPositions, {
      fieldLimit: FIELD_LIMIT,
      minSpacing: MIN_SPACING,
      maxAttempts: MAX_ATTEMPTS,
      y: -0.45,
    });

    if (!position) {
      continue;
    }

    waterSources.push({
      id: `watersource_${i}`,
      name: `watersource_${i}`,
      position,
      size: [2, 2],
      type: 'WATERSOURCE',
      amount: 100,
      state: 'CLEAN',
    });
    occupiedPositions.push(position);
  }

  return waterSources;
};

const createCreatures = (waterSources: WaterSource[]): CreatureState[] => {
  const creatures: CreatureState[] = [];
  const occupiedPositions = waterSources.map((waterSource) => waterSource.position.clone());

  for (let i = 0; i < CREATURE_COUNT; i++) {
    const spawnPosition = findSpawnPosition(occupiedPositions, {
      fieldLimit: FIELD_LIMIT,
      minSpacing: MIN_SPACING,
      maxAttempts: MAX_ATTEMPTS,
      y: 0.15,
    });

    if (!spawnPosition) {
      continue;
    }

    creatures.push({
      id: `creature_${i}`,
      name: `creature_${i}`,
      position: spawnPosition,
      wanderDirection: createInitialWanderDirection(),
      wanderTimer: createInitialWanderTimer(),
      type: 'CREATURE',
      hp: 100,
      hunger: 100,
      thirst: 0,
      affiliation: 'GREEN',
      state: 'WANDERING',
    });
    occupiedPositions.push(spawnPosition);
  }

  return creatures;
};

export const createInitialWorld = (): WorldState => {
  const waterSources = createWaterSources();
  const creatures = createCreatures(waterSources);

  return {
    creatures,
    waterSources,
  };
};