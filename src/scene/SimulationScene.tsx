import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import CreatureLayer from '../components/CreatureLayer';
import WaterSourceLayer from '../components/WaterSourceLayer';
import { createInitialWorld } from '../simulation/createInitialWorld';
import { stepWorld } from '../simulation/stepWorld';

export default function SimulationScene() {
  const [world, setWorld] = useState(createInitialWorld);

  useFrame((_, delta) => {
    setWorld((currentWorld) => stepWorld(currentWorld, delta));
  });

  return (
    <>
      <CreatureLayer creatures={world.creatures} />
      <WaterSourceLayer waterSources={world.waterSources} />
    </>
  );
}