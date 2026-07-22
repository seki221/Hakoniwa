import type { WorldState } from '../types/world';
import { updateWanderingCreature } from './systems/movement';
import { updateThirst } from './systems/thirst';

const ACTIVE_CREATURE_ID = 'creature_0';

export const stepWorld = (
  world: WorldState,
  delta: number,
): WorldState => {
  const thirstyCreatures = world.creatures.map((creature) => (
    creature.id === ACTIVE_CREATURE_ID
      ? updateThirst(creature, delta)
      : creature
  ));

  return {
    ...world,
    creatures: thirstyCreatures.map((creature) => (
      creature.id === ACTIVE_CREATURE_ID
        ? updateWanderingCreature(creature, thirstyCreatures, world.waterSources, delta)
        : creature
    )),
  };
};
