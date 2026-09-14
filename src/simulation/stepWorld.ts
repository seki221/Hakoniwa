import type { WorldState } from '../types/world';
import {
  recoverRestingCreature,
  shouldForceRest,
  shouldKeepResting,
  updateStaminaAfterActivity,
} from './systems/fatigue';
import { updateThirst } from './systems/thirst';
import { updateWorldTime } from './systems/time';
import { updateWeather } from './systems/Weather';
import { SEEK_WATER_THIRST, updateCreatureWaterBehavior } from './systems/waterSeeking';
import { updateWaterSources } from './systems/waterSourceLifecycle';
import { updateCreatureLifeCycles } from './systems/lifeCycle';
import { updateHunger } from './systems/hunger';
import {
  shouldCreatureSeekFood,
  updateCreatureFoodBehavior,
} from './systems/foodSeeking';
import { shouldCreatureSeekWater } from './systems/waterSeeking';
import { consumeGrassBlade, updateGrassRegrowth } from './systems/grassLifecycle';
import {
  consumePlantFood,
  updatePlantFoodRegrowth,
} from './systems/plantFoodLifecycle';

export const stepWorld = (
  world: WorldState,
  delta: number,
): WorldState => {
  const time = updateWorldTime(world.time, delta);
  const weather = updateWeather(world.weather, delta * time.speed);
  const elapsedGameMinutes = delta * time.speed;
  const needyCreatures = world.creatures.map((creature) =>
    updateHunger(
      updateThirst(creature, elapsedGameMinutes),
      elapsedGameMinutes,
    ));
  let grassBlades = updateGrassRegrowth(world.grassBlades, time.elapsedSeconds);
  let plantFoods = updatePlantFoodRegrowth(world.plantFoods, time.elapsedSeconds);

  const creatures = needyCreatures.reduce<WorldState['creatures']>(
    (updatedCreatures, creature, index) => {
      const movementContext = [
        ...updatedCreatures,
        ...needyCreatures.slice(index + 1),
      ];

      const shouldRest =
        creature.thirst < SEEK_WATER_THIRST
        && (shouldForceRest(creature) || shouldKeepResting(creature));
      let updatedCreature = shouldRest
        ? recoverRestingCreature(creature, time, delta)
        : creature;

      if (!shouldRest) {
        if (shouldCreatureSeekWater(creature)) {
          updatedCreature = updateCreatureWaterBehavior(
            creature,
            movementContext,
            world.waterBasins,
            world.waterSources,
            delta,
          );
        } else if (shouldCreatureSeekFood(creature)) {
          const foodResult = updateCreatureFoodBehavior(
            creature,
            movementContext,
            grassBlades,
            plantFoods,
            world.waterBasins,
            world.waterSources,
            delta,
          );
          updatedCreature = foodResult.creature;

          if (foodResult.consumedFood?.kind === 'GRASS') {
            grassBlades = grassBlades.map((grassBlade) =>
              grassBlade.id === foodResult.consumedFood?.id
                ? consumeGrassBlade(grassBlade, time.elapsedSeconds)
                : grassBlade);
          }

          if (foodResult.consumedFood?.kind === 'PLANT_FOOD') {
            plantFoods = plantFoods.map((plantFood) =>
              plantFood.id === foodResult.consumedFood?.id
                ? consumePlantFood(plantFood, time.elapsedSeconds)
                : plantFood);
          }
        } else {
          updatedCreature = updateCreatureWaterBehavior(
            creature,
            movementContext,
            world.waterBasins,
            world.waterSources,
            delta,
          );
        }

        updatedCreature = updateStaminaAfterActivity(
          creature,
          updatedCreature,
          time,
          delta,
        );
      }

      return [...updatedCreatures, updatedCreature];
    },
    [],
  );

  const waterSources = updateWaterSources(
    world.waterSources,
    world.waterBasins,
    creatures,
    time,
    weather,
    delta,
  );
  const livingCreatures = updateCreatureLifeCycles(
    creatures,
    world.waterBasins,
    waterSources,
    delta,
  );

  return {
    ...world,
    time,
    weather,
    creatures: livingCreatures,
    grassBlades,
    plantFoods,
    waterSources,
  };
};
