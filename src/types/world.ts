import type { CreatureState } from './creature';
import type { GrassBlade } from './vegetation';
import type { WaterSource } from './waterSource';
import type { WorldTime } from './WorldTime';

export type WorldState = {
  creatures: CreatureState[];
  grassBlades: GrassBlade[];
  waterSources: WaterSource[];
  time: WorldTime;
};