import type { CreatureState } from '../../types/creature';

export const MAX_SATIETY = 100;
export const HUNGER_RATE = 0.055;

export const updateHunger = (
  creature: CreatureState,
  delta: number,
): CreatureState => ({
  ...creature,
  hunger: Math.max(0, creature.hunger - HUNGER_RATE * delta),
});
