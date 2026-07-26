import type { WorldState } from '../types/world';
import { updateWanderingCreature } from './systems/movement';
import { updateThirst } from './systems/thirst';

const ACTIVE_CREATURE_LIMIT = 100;

const isActiveCreature = (index: number): boolean => index < ACTIVE_CREATURE_LIMIT;

export const stepWorld = (
  world: WorldState,
  delta: number,
): WorldState => {
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
        updateWanderingCreature(creature, movementContext, world.waterSources, delta),
      ];
    },
    [],
  );

  return {
    ...world,
    creatures,
  };
};
