import type { WorldState } from '../types/world';
import { updateThirst } from './systems/thirst';

export const stepWorld = (
  world: WorldState,
  delta: number,
): WorldState => ({
  ...world,
  creatures: world.creatures.map((creature) => updateThirst(creature, delta)),
});
