import AmoebaBody from './AmoebaBody';
import type { SimulationAgent } from './types';

type RedAmoebaProps = {
  agent: SimulationAgent;
};

export default function RedAmoeba({ agent }: RedAmoebaProps) {
  return (
    <AmoebaBody
      agent={agent}
      color="#dc2626"
      accentColor="#fecaca"
      scale={[1.12, 0.74, 0.92]}
    />
  );
}
