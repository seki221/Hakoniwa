import type { WorldState } from '../types/world';
import {
  recoverRestingCreature,
  shouldForceRest,
  shouldKeepResting,
  updateStaminaAfterActivity,
} from './systems/fatigue';
import { updateThirst } from './systems/thirst';
import { updateWorldTime } from './systems/time';
import { updateWeather } from './systems/Weather';
import { SEEK_WATER_THIRST, updateCreatureWaterBehavior } from './systems/waterSeeking';
import { updateWaterSources } from './systems/waterSourceLifecycle';
import { updateCreatureLifeCycles } from './systems/lifeCycle';

export const stepWorld = (
  world: WorldState,
  delta: number,
): WorldState => {
  const time = updateWorldTime(world.time, delta);
  const weather = updateWeather(world.weather, delta * time.speed);
  const thirstyCreatures = world.creatures.map((creature) => updateThirst(creature, delta));

  const creatures = thirstyCreatures.reduce<WorldState['creatures']>(
    (updatedCreatures, creature, index) => {

      const movementContext = [
        ...updatedCreatures,
        ...thirstyCreatures.slice(index + 1),
      ];

      const shouldRest =
        creature.thirst < SEEK_WATER_THIRST
        && (shouldForceRest(creature) || shouldKeepResting(creature));
      const updatedCreature = shouldRest
        ? recoverRestingCreature(creature, time, delta)
        : updateStaminaAfterActivity(
          creature,
          updateCreatureWaterBehavior(
            creature,
            movementContext,
            world.waterBasins,
            world.waterSources,
            delta,
          ),
          time,
          delta,
        );

      return [...updatedCreatures, updatedCreature];
    },
    [],
  );

  const waterSources = updateWaterSources(
    world.waterSources,
    world.waterBasins,
    creatures,
    time,
    weather,
    delta,
  );
  const livingCreatures = updateCreatureLifeCycles(
    creatures,
    world.waterBasins,
    waterSources,
    delta,
  );

  return {
    ...world,
    time,
    weather,
    creatures: livingCreatures,
    waterSources,
  };
};
