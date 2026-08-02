import type { WorldTime } from '../../types/WorldTime';

const SUN_DISTANCE = 100;
const MINUTES_PER_DAY = 24 * 60;

export const getSunPosition = (time: WorldTime): [number, number, number] => {
  const minutesOfDay = time.hour * 60 + time.minute;
  const dayProgress = minutesOfDay / MINUTES_PER_DAY;
  const sunAngle = (dayProgress - 0.25) * Math.PI * 2;

  return [
    Math.cos(sunAngle) * SUN_DISTANCE,
    Math.sin(sunAngle) * SUN_DISTANCE,
    30,
  ];
};

export const getDaylightAmount = (time: WorldTime): number => {
  const [, sunY] = getSunPosition(time);
  const horizonAmount = (sunY / SUN_DISTANCE + 0.15) / 1.15;

  return Math.max(0, Math.min(1, horizonAmount));
};
