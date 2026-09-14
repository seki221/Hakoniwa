import type { CreatureState } from '../../types/creature';

const MAX_THIRST = 100;
export const DEHYDRATION_DAYS = 3;
const GAME_MINUTES_PER_DAY = 24 * 60;
const THIRST_RATE_PER_GAME_MINUTE =
  MAX_THIRST / (DEHYDRATION_DAYS * GAME_MINUTES_PER_DAY);

export const updateThirst = (
  creature: CreatureState,
  elapsedGameMinutes: number,
): CreatureState => ({
  ...creature,
  thirst: Math.min(
    creature.thirst + elapsedGameMinutes * THIRST_RATE_PER_GAME_MINUTE,
    MAX_THIRST,
  ),
});
