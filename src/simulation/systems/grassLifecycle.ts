import type { GrassBlade } from '../../types/vegetation';

const MIN_REGROWTH_SECONDS = 120;
const MAX_REGROWTH_SECONDS = 240;

const createRegrowthTime = (): number =>
  MIN_REGROWTH_SECONDS
  + Math.random() * (MAX_REGROWTH_SECONDS - MIN_REGROWTH_SECONDS);

export const consumeGrassBlade = (
  grassBlade: GrassBlade,
  elapsedSeconds: number,
): GrassBlade => ({
  ...grassBlade,
  isEdible: false,
  regrowsAt: elapsedSeconds + createRegrowthTime(),
});

export const updateGrassRegrowth = (
  grassBlades: GrassBlade[],
  elapsedSeconds: number,
): GrassBlade[] => {
  const hasRegrownGrass = grassBlades.some(
    (grassBlade) => !grassBlade.isEdible && grassBlade.regrowsAt <= elapsedSeconds,
  );

  if (!hasRegrownGrass) return grassBlades;

  return grassBlades.map((grassBlade) =>
    !grassBlade.isEdible && grassBlade.regrowsAt <= elapsedSeconds
      ? { ...grassBlade, isEdible: true, regrowsAt: 0 }
      : grassBlade);
};
