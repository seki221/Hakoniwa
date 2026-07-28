import type { CreatureState } from '../types/creature';
import { CREATURE_RADIUS } from '../simulation/systems/space';

type CreatureLayerProps = {
  creatures: CreatureState[];
};

export default function CreatureLayer({ creatures }: CreatureLayerProps) {
  return (
    <group>
      {creatures.map((creature) => (
        <mesh key={creature.id} position={creature.position}>
          <sphereGeometry args={[CREATURE_RADIUS]} />
          <meshStandardMaterial color="#b3976d" />
        </mesh>
      ))}
    </group>
  );
}