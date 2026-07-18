import type { CreatureState } from './creature';
import type { WaterSource } from './waterSource';

export type WorldState = {
  creatures: CreatureState[];
  waterSources: WaterSource[];
};