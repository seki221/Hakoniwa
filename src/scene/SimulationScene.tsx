import { useState } from 'react';
import CreatureLayer from '../components/CreatureLayer';
import WaterSourceLayer from '../components/WaterSourceLayer';
import { createInitialWorld } from '../simulation/createInitialWorld';

export default function SimulationScene() {
  const [world] = useState(createInitialWorld);

  return (
    <>
      <CreatureLayer creatures={world.creatures} />
      <WaterSourceLayer waterSources={world.waterSources} />
    </>
  );
}