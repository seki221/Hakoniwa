import * as THREE from 'three';
import type { CreatureState } from '../types/creature';
import type { WaterSource } from '../types/waterSource';
import type { WorldState } from '../types/world';
import {
  createInitialWanderDirection,
  createInitialWanderTimer,
} from './systems/movement';
import { FIELD_LIMIT } from './systems/space';
import { findSpawnPosition } from './systems/spawning';
import { createInitialWorldTime } from './systems/time';
import { createInitialWaterSources } from './systems/waterSourceSpawning';

const MIN_SPACING = 2.5;
const MAX_ATTEMPTS = 100;
const CREATURE_COUNT = 20;

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
      velocity: new THREE.Vector3(0, 0, 0),
      wanderDirection: createInitialWanderDirection(),
      wanderTimer: createInitialWanderTimer(),
      targetWaterSourceId: null,
      type: 'CREATURE',
      hp: 100,
      stamina: 100,
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
  const waterSources = createInitialWaterSources();
  const creatures = createCreatures(waterSources);

  return {
    creatures,
    waterSources,
    time: createInitialWorldTime(),
  };
};
