import type { PlantFood } from '../../types/vegetation';

const MIN_REGROWTH_SECONDS = 240;
const MAX_REGROWTH_SECONDS = 420;

export const consumePlantFood = (plantFood: PlantFood): PlantFood => ({
  ...plantFood,
  isAvailable: false,
  regrowthRemaining: MIN_REGROWTH_SECONDS
    + Math.random() * (MAX_REGROWTH_SECONDS - MIN_REGROWTH_SECONDS),
});

export const updatePlantFoodRegrowth = (
  plantFoods: PlantFood[],
  delta: number,
): PlantFood[] =>
  plantFoods.map((plantFood) => {
    if (plantFood.isAvailable) return plantFood;

    const regrowthRemaining = Math.max(0, plantFood.regrowthRemaining - delta);

    return {
      ...plantFood,
      isAvailable: regrowthRemaining === 0,
      regrowthRemaining,
    };
  });
