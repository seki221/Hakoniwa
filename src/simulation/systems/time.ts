import type { WorldTime } from '../../types/WorldTime';

const MINUTES_PER_DAY = 24 * 60;
const START_HOUR = 6;
const START_MINUTE = 0;
const START_TOTAL_MINUTES = START_HOUR * 60 + START_MINUTE;
const DEFAULT_GAME_MINUTES_PER_REAL_SECOND = 10;

const toClockTime = (totalGameMinutes: number) => {
  const day = Math.floor(totalGameMinutes / MINUTES_PER_DAY);
  const minuteOfDay = Math.floor(totalGameMinutes % MINUTES_PER_DAY);

  return {
    day,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
  };
};

export const createInitialWorldTime = (): WorldTime => ({
  tick: 0,
  elapsedSeconds: 0,
  day: 0,
  hour: START_HOUR,
  minute: START_MINUTE,
  speed: DEFAULT_GAME_MINUTES_PER_REAL_SECOND,
});

export const updateWorldTime = (
  time: WorldTime,
  delta: number,
): WorldTime => {
  const elapsedSeconds = time.elapsedSeconds + delta;
  const totalGameMinutes = START_TOTAL_MINUTES + elapsedSeconds * time.speed;
  const clockTime = toClockTime(totalGameMinutes);

  return {
    ...time,
    ...clockTime,
    tick: time.tick + 1,
    elapsedSeconds,
  };
};
