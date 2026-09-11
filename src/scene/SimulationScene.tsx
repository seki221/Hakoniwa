import CreatureLayer from '../components/CreatureLayer';
import GrassLayer from '../components/GrassLayer';
import WeatherCloudLayer from '../components/WeatherCloudLayer';
import WaterSourceLayer from '../components/WaterSourceLayer';
import { AnimatedSky } from '../simulation/AnimatedSky';
import type { WorldState } from '../types/world';

type SimulationSceneProps = {
  world: WorldState;
};

export default function SimulationScene({ world }: SimulationSceneProps) {
  return (
    <>
      <AnimatedSky time={world.time} />
      <WeatherCloudLayer weather={world.weather} />
      <GrassLayer grassBlades={world.grassBlades} />
      <CreatureLayer creatures={world.creatures} />
      <WaterSourceLayer waterBasins={world.waterBasins} waterSources={world.waterSources} />
    </>
  );
}
