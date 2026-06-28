import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Field from './Field';
import SimulationDebugPanel from './SimulationDebugPanel';
import BlackAmoeba from './amoeba/BlackAmoeba';
import GreenAmoeba from './amoeba/GreenAmoeba';
import RedAmoeba from './amoeba/RedAmoeba';
import { createAgent, stepSimulation } from './amoeba/behavior';
import type { AmoebaSpecies, SimulationAgent, VectorTuple, WaterSource } from './amoeba/types';

type SimulationLoopProps = {
  onTick: (delta: number) => void;
};

function SimulationLoop({ onTick }: SimulationLoopProps) {
  useFrame((_, delta) => {
    onTick(delta);
  });

  return null;
}

function buildInitialAgents() {
  return [
    createAgent('green-1', 'green', [-2.2, 0.5, 1.2]),
    createAgent('green-2', 'green', [-1.2, 0.5, -1.5]),
    createAgent('green-3', 'green', [1.2, 0.5, 1.6]),
    createAgent('green-4', 'green', [0.4, 0.5, -2.2]),
    createAgent('red-1', 'red', [3.2, 0.5, 1.2]),
    createAgent('red-2', 'red', [2.8, 0.5, -2.4]),
    createAgent('black-1', 'black', [-3.6, 0.5, 0.2]),
    createAgent('black-2', 'black', [-0.8, 0.5, 2.8]),
  ];
}

function renderAgent(agent: SimulationAgent) {
  if (agent.species === 'green') {
    return <GreenAmoeba key={agent.id} agent={agent} />;
  }

  if (agent.species === 'red') {
    return <RedAmoeba key={agent.id} agent={agent} />;
  }

  return <BlackAmoeba key={agent.id} agent={agent} />;
}

export default function World() {
  const waterSources = useMemo<WaterSource[]>(
    () => [
      { id: 'water-1', position: [5, 0.5, 5], size: [2, 2] },
      { id: 'water-2', position: [5, 0.5, -5], size: [5, 5] },
      { id: 'water-3', position: [-5, 0.5, -5], size: [2, 2] },
      { id: 'water-4', position: [-5, 0.5, 5], size: [2, 2] },
    ],
    [],
  );
  const [agents, setAgents] = useState<SimulationAgent[]>(() => buildInitialAgents());
  const agentsRef = useRef(agents);
  const nextIdRef = useRef(100);

  const createId = useCallback((species: AmoebaSpecies) => {
    nextIdRef.current += 1;
    return `${species}-${nextIdRef.current}`;
  }, []);

  const updateAgents = useCallback((delta: number) => {
    const nextAgents = stepSimulation({
      agents: agentsRef.current,
      waterSources,
      delta,
      createId,
    });

    agentsRef.current = nextAgents;
    setAgents(nextAgents);
  }, [createId, waterSources]);

  return (
    <div style={{ height: '500px', background: '#f0f0f0', position: 'relative' }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <SimulationLoop onTick={updateAgents} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <OrbitControls />
        <Field />
        {agents.map(renderAgent)}

        {waterSources.map((water) => (
          <mesh key={water.id} position={water.position as VectorTuple}>
            <boxGeometry args={[water.size[0], 0.1, water.size[1]]} />
            <meshStandardMaterial color="blue" />
          </mesh>
        ))}
      </Canvas>
      <SimulationDebugPanel agents={agents} />
    </div>
  );
}