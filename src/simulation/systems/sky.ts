import type { WorldTime } from '../../types/WorldTime';

const SUN_DISTANCE = 120;
const MOON_DISTANCE = 180;
const MINUTES_PER_DAY = 24 * 60;
const SOLAR_NOON_MINUTE = 12 * 60;
const SEASON_LENGTH_DAYS = 32;
const AVERAGE_DAYLIGHT_MINUTES = 12 * 60;
const DAYLIGHT_VARIATION_MINUTES = 2.5 * 60;
const TWILIGHT_MINUTES = 300;
const SYNODIC_MONTH_DAYS = 29.53;
const INITIAL_MOON_AGE_DAYS = 10;

export type SolarCycle = {
  daylightMinutes: number;
  sunriseMinute: number;
  sunsetMinute: number;
  dawnStartMinute: number;
  duskEndMinute: number;
  seasonAmount: number;
};

export type MoonPhase = {
  ageDays: number;
  progress: number;
  illumination: number;
  waxing: boolean;
};

const getMinutesOfDay = (time: WorldTime): number =>
  time.hour * 60 + time.minute;

const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));

  return x * x * x * (x * (x * 6 - 15) + 10);
};

const getSeasonAmount = (day: number): number =>
  Math.sin((day / SEASON_LENGTH_DAYS) * Math.PI * 2);

export const getSolarCycle = (time: WorldTime): SolarCycle => {
  const seasonAmount = getSeasonAmount(time.day);
  const daylightMinutes =
    AVERAGE_DAYLIGHT_MINUTES + seasonAmount * DAYLIGHT_VARIATION_MINUTES;
  const sunriseMinute = SOLAR_NOON_MINUTE - daylightMinutes / 2;
  const sunsetMinute = SOLAR_NOON_MINUTE + daylightMinutes / 2;

  return {
    daylightMinutes,
    sunriseMinute,
    sunsetMinute,
    dawnStartMinute: Math.max(0, sunriseMinute - TWILIGHT_MINUTES),
    duskEndMinute: Math.min(MINUTES_PER_DAY, sunsetMinute + TWILIGHT_MINUTES),
    seasonAmount,
  };
};

const getNightProgress = (
  minutesOfDay: number,
  sunsetMinute: number,
  sunriseMinute: number,
): number => {
  const nightMinutes = MINUTES_PER_DAY - (sunsetMinute - sunriseMinute);

  if (minutesOfDay >= sunsetMinute) {
    return (minutesOfDay - sunsetMinute) / nightMinutes;
  }

  return (minutesOfDay + MINUTES_PER_DAY - sunsetMinute) / nightMinutes;
};

const getSunAngle = (time: WorldTime): number => {
  const minutesOfDay = getMinutesOfDay(time);
  const { sunriseMinute, sunsetMinute } = getSolarCycle(time);

  if (minutesOfDay >= sunriseMinute && minutesOfDay <= sunsetMinute) {
    const daylightProgress =
      (minutesOfDay - sunriseMinute) / (sunsetMinute - sunriseMinute);

    return daylightProgress * Math.PI;
  }

  return Math.PI + getNightProgress(minutesOfDay, sunsetMinute, sunriseMinute) * Math.PI;
};

export const getSunPosition = (time: WorldTime): [number, number, number] => {
  const sunAngle = getSunAngle(time);
  const { seasonAmount } = getSolarCycle(time);

  return [
    Math.cos(sunAngle) * SUN_DISTANCE,
    Math.sin(sunAngle) * SUN_DISTANCE,
    28 + seasonAmount * 16,
  ];
};

export const getDaylightAmount = (time: WorldTime): number => {
  const minutesOfDay = getMinutesOfDay(time);
  const {
    sunriseMinute,
    sunsetMinute,
    dawnStartMinute,
    duskEndMinute,
  } = getSolarCycle(time);

  if (minutesOfDay < dawnStartMinute || minutesOfDay > duskEndMinute) {
    return 0;
  }

  if (minutesOfDay < sunriseMinute) {
    return smoothstep(dawnStartMinute, sunriseMinute, minutesOfDay) * 0.45;
  }

  if (minutesOfDay <= sunsetMinute) {
    const morningLift = smoothstep(sunriseMinute, sunriseMinute + TWILIGHT_MINUTES, minutesOfDay);
    const eveningFall = 1 - smoothstep(sunsetMinute - TWILIGHT_MINUTES, sunsetMinute, minutesOfDay);

    return Math.max(0.45, Math.min(1, Math.min(morningLift, eveningFall) + 0.45));
  }

  return (1 - smoothstep(sunsetMinute, duskEndMinute, minutesOfDay)) * 0.45;
};

export const getTwilightAmount = (time: WorldTime): number => {
  const daylight = getDaylightAmount(time);

  if (daylight <= 0 || daylight >= 0.75) {
    return 0;
  }

  return Math.max(0, Math.min(1, 1 - Math.abs(daylight - 0.35) / 0.35));
};

export const getMoonPhase = (time: WorldTime): MoonPhase => {
  const dayProgress = getMinutesOfDay(time) / MINUTES_PER_DAY;
  const ageDays = (INITIAL_MOON_AGE_DAYS + time.day + dayProgress) % SYNODIC_MONTH_DAYS;
  const progress = ageDays / SYNODIC_MONTH_DAYS;
  const illumination = (1 - Math.cos(progress * Math.PI * 2)) / 2;

  return {
    ageDays,
    progress,
    illumination,
    waxing: progress < 0.5,
  };
};

export const getMoonPosition = (time: WorldTime): [number, number, number] => {
  const sunAngle = getSunAngle(time);
  const phase = getMoonPhase(time);
  const moonAngle = sunAngle + phase.progress * Math.PI * 2;

  return [
    Math.cos(moonAngle) * MOON_DISTANCE,
    Math.sin(moonAngle) * MOON_DISTANCE,
    -36,
  ];
};

export const getMoonVisibilityAmount = (time: WorldTime): number => {
  const [, moonY] = getMoonPosition(time);
  const heightVisibility = smoothstep(-0.08, 0.18, moonY / MOON_DISTANCE);
  const daylightVisibility = 1 - getDaylightAmount(time) * 1.5;

  return Math.max(0, Math.min(1, heightVisibility * daylightVisibility));
};
