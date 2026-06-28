import type { SimulationAgent } from './types';

type AmoebaBodyProps = {
  agent: SimulationAgent;
  color: string;
  accentColor: string;
  scale?: [number, number, number];
};

export default function AmoebaBody({
  agent,
  color,
  accentColor,
  scale = [1, 1, 1],
}: AmoebaBodyProps) {
  const statusScale = 0.82 + agent.fullness * 0.28;
  const thirstPulse = 1 + agent.thirst * 0.12;

  return (
    <group position={agent.position}>
      <mesh scale={[scale[0] * statusScale, scale[1] * thirstPulse, scale[2] * statusScale]}>
        <sphereGeometry args={[0.42, 24, 16]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[0.18, 0.24, 0.18]} scale={[0.22, 0.12, 0.22]}>
        <sphereGeometry args={[0.42, 16, 10]} />
        <meshStandardMaterial color={accentColor} roughness={0.65} />
      </mesh>
    </group>
  );
}