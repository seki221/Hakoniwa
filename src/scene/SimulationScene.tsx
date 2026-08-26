import { Cloud } from '@react-three/drei';
import CreatureLayer from '../components/CreatureLayer';
import WaterSourceLayer from '../components/WaterSourceLayer';
import { AnimatedSky } from '../simulation/AnimatedSky';
import { getDaylightAmount } from '../simulation/systems/sky';
import type { WorldState } from '../types/world';

type SimulationSceneProps = {
  world: WorldState;
};

export default function SimulationScene({ world }: SimulationSceneProps) {
  const daylight = getDaylightAmount(world.time);

  return (
    <>
      <AnimatedSky time={world.time} />
      <Cloud
        position={[0, 15, -20]}
        bounds={[10, 2, 2]}
        opacity={0.25 + daylight * 0.35}
        speed={0.4}
        segments={20}
      />
      <CreatureLayer creatures={world.creatures} />
      <WaterSourceLayer waterSources={world.waterSources} />
    </>
  );
}
