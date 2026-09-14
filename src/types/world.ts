import type { CreatureState } from './creature';
import type { WaterBasin, WaterSource } from './waterSource';
import type { GrassBlade, PlantFood } from './vegetation';
import type { WorldTime } from './WorldTime';
import type { WeatherState } from './Weather';

export type WorldState = {
  creatures: CreatureState[];
  grassBlades: GrassBlade[];
  plantFoods: PlantFood[];
  waterBasins: WaterBasin[];
  waterSources: WaterSource[];
  time: WorldTime;
  weather: WeatherState;
};
