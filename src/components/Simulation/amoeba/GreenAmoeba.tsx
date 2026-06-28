import AmoebaBody from './AmoebaBody';
import type { SimulationAgent } from './types';

type GreenAmoebaProps = {
  agent: SimulationAgent;
};

export default function GreenAmoeba({ agent }: GreenAmoebaProps) {
  return (
    <AmoebaBody
      agent={agent}
      color="#25b86f"
      accentColor="#a7f3d0"
      scale={[1.05, 0.82, 1.05]}
    />
  );
}
