import type { CreatureState } from '../types/creature';

type CreatureLayerProps = {
  creatures: CreatureState[];
};

export default function CreatureLayer({ creatures }: CreatureLayerProps) {
  return (
    <group>
      {creatures.map((creature) => (
        <mesh key={creature.id} position={creature.position}>
          <sphereGeometry args={[0.3]} />
          <meshStandardMaterial color="green" />
        </mesh>
      ))}
    </group>
  );
}