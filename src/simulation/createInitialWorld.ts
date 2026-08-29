import * as THREE from 'three';
import type { CreatureState } from '../types/creature';
import type { WaterSource } from '../types/waterSource';
import type { WorldState } from '../types/world';
import {
  createInitialWanderDirection,
  createInitialWanderTimer,
} from './systems/movement';
import {
  FIELD_LIMIT,
  CREATURE_GROUND_Y,
  getCreatureHeightAtPosition,
  getWaterSourceInteractionDistance,
} from './systems/space';
import { findSpawnPosition, type SpawnObstacle } from './systems/spawning';
import { createInitialStaminaProfile } from './systems/fatigue';
import { createInitialWorldTime } from './systems/time';
import { createInitialWaterSources } from './systems/waterSourceSpawning';

const MIN_SPACING = 2.5;
const MAX_ATTEMPTS = 100;
const CREATURE_COUNT = 20;

const createCreatures = (waterSources: WaterSource[]): CreatureState[] => {
  const creatures: CreatureState[] = [];
  const occupiedAreas: SpawnObstacle[] = waterSources.map((waterSource) => ({
    position: waterSource.position.clone(),
    minDistance: getWaterSourceInteractionDistance(waterSource),
  }));

  for (let i = 0; i < CREATURE_COUNT; i++) {
    const spawnPosition = findSpawnPosition(occupiedAreas, {
      fieldLimit: FIELD_LIMIT,
      maxAttempts: MAX_ATTEMPTS,
      y: CREATURE_GROUND_Y,
    });

    if (!spawnPosition) {
      continue;
    }

    spawnPosition.y = getCreatureHeightAtPosition(spawnPosition, waterSources);

    const staminaProfile = createInitialStaminaProfile(i);

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
      stamina: staminaProfile.maxStamina,
      staminaProfile,
      hunger: 100,
      thirst: 0,
      affiliation: 'GREEN',
      state: 'WANDERING',
    });
    occupiedAreas.push({
      position: spawnPosition,
      minDistance: MIN_SPACING,
    });
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
