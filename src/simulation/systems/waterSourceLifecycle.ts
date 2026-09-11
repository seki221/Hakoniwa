import type { CreatureState } from '../../types/creature';
import type { WeatherState } from '../../types/Weather';
import type { WorldTime } from '../../types/WorldTime';
import {
  getWaterBasinBySource,
  type WaterBasin,
  type WaterSource,
  type WaterSourceState,
  type WaterTerrainKind,
} from '../../types/waterSource';
import { getDaylightAmount } from './sky';
import { DRINK_RATE } from './waterSeeking';

const SPRING_RESPAWN_CHANCE_PER_SECOND = 0.06;
const DEFAULT_FILL_RATIO = 0.85;
const POLLUTED_FILL_RATIO = 0.45;
const BASE_SPRING_EVAPORATION_RATE = 0.035;
const DAYLIGHT_EVAPORATION_BONUS = 0.09;
const REFERENCE_SPRING_AREA = 1.4 * 1.4;
const RAIN_REFILL_RATE = 0.45;

const getEvaporationRate = (
  waterBasin: WaterBasin,
  time: WorldTime,
): number => {
  const daylightFactor = getDaylightAmount(time);
  const surfaceArea = waterBasin.size[0] * waterBasin.size[1];
  const areaFactor = Math.sqrt(surfaceArea / REFERENCE_SPRING_AREA);
  const terrainFactor = waterBasin.terrainKind === 'MARSH' ? 0.55 : 1;

  return (
    (BASE_SPRING_EVAPORATION_RATE + DAYLIGHT_EVAPORATION_BONUS * daylightFactor)
    * areaFactor
    * terrainFactor
  );
};

const isTemporarySpring = (waterSource: WaterSource): boolean =>
  waterSource.id.startsWith('watersource_spring_');

const chooseRespawnState = (terrainKind: WaterTerrainKind): WaterSourceState => {
  if (terrainKind === 'MARSH') {
    return 'CLEAN';
  }

  return Math.random() < 0.18 ? 'POLLUTED' : 'CLEAN';
};

const getDrinkAmount = (
  waterSource: WaterSource,
  creatures: CreatureState[],
  delta: number,
): number => {
  const drinkingCreatures = creatures.filter((creature) =>
    creature.state === 'DRINKING'
    && creature.targetWaterSourceId === waterSource.id);

  return drinkingCreatures.length * DRINK_RATE * delta;
};

const getRainRefillAmount = (
  weather: WeatherState,
  delta: number,
): number =>
  RAIN_REFILL_RATE * weather.precipitation * delta;

const updateWaterAmount = (
  waterSource: WaterSource,
  waterBasin: WaterBasin,
  creatures: CreatureState[],
  time: WorldTime,
  weather: WeatherState,
  delta: number,
): WaterSource => {
  if (!isTemporarySpring(waterSource)) {
    return waterSource;
  }

  const rainRefillAmount = getRainRefillAmount(weather, delta);

  if (waterSource.state === 'DRY' && rainRefillAmount <= 0) {
    return waterSource;
  }

  const evaporationAmount = waterSource.state === 'DRY'
    ? 0
    : getEvaporationRate(waterBasin, time) * delta;
  const nextAmount = Math.min(
    waterSource.capacity,
    Math.max(
      0,
      waterSource.amount
        + rainRefillAmount
        - getDrinkAmount(waterSource, creatures, delta)
        - evaporationAmount,
    ),
  );

  return {
    ...waterSource,
    amount: nextAmount,
    state: nextAmount <= 0
      ? 'DRY'
      : waterSource.state === 'DRY'
        ? 'CLEAN'
        : waterSource.state,
  };
};

const respawnSpringWater = (
  waterSource: WaterSource,
  waterBasin: WaterBasin,
  delta: number,
): WaterSource => {
  if (
    !isTemporarySpring(waterSource)
    || waterSource.state !== 'DRY'
    || Math.random() > SPRING_RESPAWN_CHANCE_PER_SECOND * delta
  ) {
    return waterSource;
  }

  const state = chooseRespawnState(waterBasin.terrainKind);
  const fillRatio = state === 'CLEAN' ? DEFAULT_FILL_RATIO : POLLUTED_FILL_RATIO;

  return {
    ...waterSource,
    amount: waterSource.capacity * fillRatio,
    state,
  };
};

export const updateWaterSources = (
  waterSources: WaterSource[],
  waterBasins: WaterBasin[],
  creatures: CreatureState[],
  time: WorldTime,
  weather: WeatherState,
  delta: number,
): WaterSource[] =>
  waterSources.map((waterSource) => {
    const waterBasin = getWaterBasinBySource(waterSource, waterBasins);

    if (!waterBasin) {
      return waterSource;
    }

    const updatedWaterSource = updateWaterAmount(
      waterSource,
      waterBasin,
      creatures,
      time,
      weather,
      delta,
    );

    return respawnSpringWater(updatedWaterSource, waterBasin, delta);
  });
