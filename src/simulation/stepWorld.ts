import type { WorldState } from '../types/world';
import { updateThirst } from './systems/thirst';
import { updateWorldTime } from './systems/time';
import { updateCreatureWaterBehavior } from './systems/waterSeeking';

const ACTIVE_CREATURE_LIMIT = 1;

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

      return [
        ...updatedCreatures,
        updateCreatureWaterBehavior(creature, movementContext, world.waterSources, delta),
      ];
    },
    [],
  );

  return {
    ...world,
    time,
    creatures,
  };
};
