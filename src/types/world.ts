import type { CreatureState } from './creature';
import type { WaterSource } from './waterSource';
import type { WorldTime } from './WorldTime';

export type WorldState = {
  creatures: CreatureState[];
  waterSources: WaterSource[];
  time: WorldTime;
};