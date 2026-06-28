import AmoebaBody from './AmoebaBody';
import type { SimulationAgent } from './types';

type BlackAmoebaProps = {
  agent: SimulationAgent;
};

export default function BlackAmoeba({ agent }: BlackAmoebaProps) {
  return (
    <AmoebaBody
      agent={agent}
      color="#1f2937"
      accentColor="#9ca3af"
      scale={[1.18, 0.86, 1.18]}
    />
  );
}
