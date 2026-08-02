import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud } from '@react-three/drei';
import CreatureLayer from '../components/CreatureLayer';
import WaterSourceLayer from '../components/WaterSourceLayer';
import { createInitialWorld } from '../simulation/createInitialWorld';
import { stepWorld } from '../simulation/stepWorld';
import { AnimatedSky } from '../simulation/AnimatedSky';
import { getDaylightAmount } from '../simulation/systems/sky';

export default function SimulationScene() {
  const [world, setWorld] = useState(createInitialWorld);
  const daylight = getDaylightAmount(world.time);

  useFrame((_, delta) => {
    setWorld((currentWorld) => stepWorld(currentWorld, delta));
  });
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
