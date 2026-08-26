import { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Field } from './Field';
import { Physics } from '@react-three/rapier';
import SimulationScene from './scene/SimulationScene';
import { FIELD_SIZE } from './Field';
import { createInitialWorld } from './simulation/createInitialWorld';
import { stepWorld } from './simulation/stepWorld';

function WorldScene() {
  const [world, setWorld] = useState(createInitialWorld);

  useFrame((_, delta) => {
    setWorld((currentWorld) => stepWorld(currentWorld, delta));
  });

  return (
    <>
      <OrbitControls
        minDistance={4}
        maxDistance={FIELD_SIZE + 5}
        maxPolarAngle={Math.PI}
      />
      <Physics gravity={[0, -9.81, 0]}>
        <Field waterSources={world.waterSources} />
      </Physics>
      <SimulationScene world={world} />
    </>
  );
}

export default function World() {
  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#f0f0f0' }}>
      <Canvas
          shadows
          style={{ display: 'block' }}
          camera={{
            position: [5, 5, 5],
            fov: 50,
            near: 0.1,
            far: 2000,
          }}
        >
        <WorldScene />
      </Canvas>
    </div>
  );
}
