import type { WorldState } from '../types/world';
import {
  recoverRestingCreature,
  shouldForceRest,
  shouldKeepResting,
  updateStaminaAfterActivity,
} from './systems/fatigue';
import { updateThirst } from './systems/thirst';
import { updateWorldTime } from './systems/time';
import { SEEK_WATER_THIRST, updateCreatureWaterBehavior } from './systems/waterSeeking';

const ACTIVE_CREATURE_LIMIT = 20;

const isActiveCreature = (index: number): boolean => index < ACTIVE_CREATURE_LIMIT;

export const stepWorld = (
  world: WorldState,
  delta: number,
): WorldState => {
  const time = updateWorldTime(world.time, delta);
  const thirstyCreatures = world.creatures.map((creature, index) => (
    isActiveCreature(index)
      ? updateThirst(creature, delta)
      : creature
  ));

  const creatures = thirstyCreatures.reduce<WorldState['creatures']>(
    (updatedCreatures, creature, index) => {
      if (!isActiveCreature(index)) {
        return [...updatedCreatures, creature];
      }

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
          updateCreatureWaterBehavior(creature, movementContext, world.waterSources, delta),
          time,
          delta,
        );

      return [...updatedCreatures, updatedCreature];
    },
    [],
  );

  return {
    ...world,
    time,
    creatures,
  };
};
