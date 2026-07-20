import type { CreatureState } from '../../types/creature';

const MAX_THIRST = 100;
const THIRST_RATE = 2;

export const updateThirst = (
  creature: CreatureState,
  delta: number,
): CreatureState => ({
  ...creature,
  thirst: Math.min(creature.thirst + delta * THIRST_RATE, MAX_THIRST),
});