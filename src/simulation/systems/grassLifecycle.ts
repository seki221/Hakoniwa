import type { GrassBlade } from '../../types/vegetation';

const MIN_REGROWTH_SECONDS = 120;
const MAX_REGROWTH_SECONDS = 240;

const createRegrowthTime = (): number =>
  MIN_REGROWTH_SECONDS
  + Math.random() * (MAX_REGROWTH_SECONDS - MIN_REGROWTH_SECONDS);

export const consumeGrassBlade = (grassBlade: GrassBlade): GrassBlade => ({
  ...grassBlade,
  isEdible: false,
  regrowthRemaining: createRegrowthTime(),
});

export const updateGrassRegrowth = (
  grassBlades: GrassBlade[],
  delta: number,
): GrassBlade[] =>
  grassBlades.map((grassBlade) => {
    if (grassBlade.isEdible) return grassBlade;

    const regrowthRemaining = Math.max(0, grassBlade.regrowthRemaining - delta);

    return {
      ...grassBlade,
      isEdible: regrowthRemaining === 0,
      regrowthRemaining,
    };
  });
