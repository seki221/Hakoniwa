import type { GrassBlade, PlantFood } from '../../types/vegetation';

const FRUIT_COLORS = ['#c84b31', '#e28b32', '#724f9d'];
const FOOD_SPACING = 23;

export const createInitialPlantFoods = (
  grassBlades: GrassBlade[],
): PlantFood[] =>
  grassBlades.reduce<PlantFood[]>((plantFoods, grassBlade, index) => {
    if (index % FOOD_SPACING !== 0) return plantFoods;

    return [
      ...plantFoods,
      {
        id: `plant_food_${index}`,
        position: grassBlade.position.clone(),
        color: FRUIT_COLORS[index % FRUIT_COLORS.length],
        nutrition: 55,
        isAvailable: true,
        regrowthRemaining: 0,
      },
    ];
  }, []);
