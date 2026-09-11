import * as THREE from 'three';
import type { CreatureState } from '../types/creature';
import type { WaterBasin, WaterSource } from '../types/waterSource';
import type { WorldState } from '../types/world';
import {
  createInitialWanderDirection,
  createInitialWanderTimer,
} from './systems/movement';
import {
  FIELD_LIMIT,
  CREATURE_GROUND_Y,
  getCreatureHeightAtPosition,
  getWaterBasinInteractionDistance,
} from './systems/space';
import { findSpawnPosition, type SpawnObstacle } from './systems/spawning';
import { createInitialStaminaProfile } from './systems/fatigue';
import { createInitialWorldTime } from './systems/time';
import { createInitialGrassBlades } from './systems/grassSpawning';
import { createInitialWaterBodies } from './systems/waterSourceSpawning';
import { createInitialWeather } from './systems/Weather';

const MIN_SPACING = 2.5;
const MAX_ATTEMPTS = 100;
const CREATURE_COUNT = 20;

const createCreatures = (
  waterBasins: WaterBasin[],
  waterSources: WaterSource[],
): CreatureState[] => {
  const creatures: CreatureState[] = [];
  const occupiedAreas: SpawnObstacle[] = waterBasins.map((waterBasin) => ({
    position: waterBasin.position.clone(),
    minDistance: getWaterBasinInteractionDistance(waterBasin),
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

    spawnPosition.y = getCreatureHeightAtPosition(spawnPosition, waterBasins, waterSources);

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
  const { waterBasins, waterSources } = createInitialWaterBodies();
  const creatures = createCreatures(waterBasins, waterSources);
  const grassBlades = createInitialGrassBlades(waterBasins);

  return {
    creatures,
    grassBlades,
    waterBasins,
    waterSources,
    time: createInitialWorldTime(),
    weather: createInitialWeather(),
  };
};
