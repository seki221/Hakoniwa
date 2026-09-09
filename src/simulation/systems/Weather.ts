import type {
  WeatherCondition,
  WeatherState,
  WindState,
} from '../../types/Weather';

type WeatherPattern = {
  condition: WeatherCondition;
  wind: WindState;
  temperature: number;
  humidity: number;
  precipitation: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  weight: number;
};

const WEATHER_PATTERNS = [
  {
    condition: 'SUNNY',
    wind: 'BREEZE',
    temperature: 24,
    humidity: 0.35,
    precipitation: 0,
    minDurationMinutes: 180,
    maxDurationMinutes: 420,
    weight: 4,
  },
  {
    condition: 'CLOUDY',
    wind: 'BREEZE',
    temperature: 20,
    humidity: 0.55,
    precipitation: 0,
    minDurationMinutes: 120,
    maxDurationMinutes: 300,
    weight: 3,
  },
  {
    condition: 'RAIN',
    wind: 'GALE',
    temperature: 17,
    humidity: 0.85,
    precipitation: 0.9,
    minDurationMinutes: 60,
    maxDurationMinutes: 180,
    weight: 2,
  },
  {
    condition: 'FOG',
    wind: 'CALM',
    temperature: 15,
    humidity: 0.95,
    precipitation: 0.05,
    minDurationMinutes: 45,
    maxDurationMinutes: 120,
    weight: 1,
  },
] satisfies WeatherPattern[];

const chooseDurationMinutes = (pattern: WeatherPattern): number =>
  pattern.minDurationMinutes
  + Math.random() * (pattern.maxDurationMinutes - pattern.minDurationMinutes);

const chooseWeatherPattern = (
  currentCondition?: WeatherCondition,
): WeatherPattern => {
  const totalWeight = WEATHER_PATTERNS.reduce((total, pattern) => (
    total + (pattern.condition === currentCondition ? pattern.weight * 0.35 : pattern.weight)
  ), 0);
  let roll = Math.random() * totalWeight;

  for (const pattern of WEATHER_PATTERNS) {
    roll -= pattern.condition === currentCondition ? pattern.weight * 0.35 : pattern.weight;

    if (roll <= 0) {
      return pattern;
    }
  }

  return WEATHER_PATTERNS[0];
};

const createWeatherFromPattern = (pattern: WeatherPattern): WeatherState => ({
  condition: pattern.condition,
  wind: pattern.wind,
  temperature: pattern.temperature,
  humidity: pattern.humidity,
  precipitation: pattern.precipitation,
  remainingMinutes: chooseDurationMinutes(pattern),
});

export const createInitialWeather = (): WeatherState => ({
  condition: 'SUNNY',
  wind: 'BREEZE',
  temperature: 24,
  humidity: 0.35,
  precipitation: 0,
  remainingMinutes: 240,
});

export const updateWeather = (
  weather: WeatherState,
  gameMinutesDelta: number,
): WeatherState => {
  const remainingMinutes = weather.remainingMinutes - gameMinutesDelta;

  if (remainingMinutes > 0) {
    return {
      ...weather,
      remainingMinutes,
    };
  }

  return createWeatherFromPattern(chooseWeatherPattern(weather.condition));
};
