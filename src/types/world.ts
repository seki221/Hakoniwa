import type { CreatureState } from './creature';
import type { WaterSource } from './waterSource';
import type { GrassBlade } from './vegetation';
import type { WorldTime } from './WorldTime';
import type { WeatherState } from './Weather';

export type WorldState = {
  creatures: CreatureState[];
  grassBlades: GrassBlade[];
  waterSources: WaterSource[];
  time: WorldTime;
  weather: WeatherState;
};