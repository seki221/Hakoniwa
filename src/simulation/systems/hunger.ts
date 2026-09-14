import type { CreatureState } from '../../types/creature';

export const MAX_SATIETY = 100;
export const STARVATION_DAYS = 21;
const GAME_MINUTES_PER_DAY = 24 * 60;
export const HUNGER_RATE_PER_GAME_MINUTE =
  MAX_SATIETY / (STARVATION_DAYS * GAME_MINUTES_PER_DAY);

export const updateHunger = (
  creature: CreatureState,
  elapsedGameMinutes: number,
): CreatureState => ({
  ...creature,
  hunger: Math.max(
    0,
    creature.hunger - HUNGER_RATE_PER_GAME_MINUTE * elapsedGameMinutes,
  ),
});
