import type { PlantFood } from '../../types/vegetation';

const MIN_REGROWTH_SECONDS = 240;
const MAX_REGROWTH_SECONDS = 420;

export const consumePlantFood = (
  plantFood: PlantFood,
  elapsedSeconds: number,
): PlantFood => ({
  ...plantFood,
  isAvailable: false,
  regrowsAt: elapsedSeconds
    + MIN_REGROWTH_SECONDS
    + Math.random() * (MAX_REGROWTH_SECONDS - MIN_REGROWTH_SECONDS),
});

export const updatePlantFoodRegrowth = (
  plantFoods: PlantFood[],
  elapsedSeconds: number,
): PlantFood[] => {
  const hasRegrownFood = plantFoods.some(
    (plantFood) => !plantFood.isAvailable && plantFood.regrowsAt <= elapsedSeconds,
  );

  if (!hasRegrownFood) return plantFoods;

  return plantFoods.map((plantFood) =>
    !plantFood.isAvailable && plantFood.regrowsAt <= elapsedSeconds
      ? { ...plantFood, isAvailable: true, regrowsAt: 0 }
      : plantFood);
};
