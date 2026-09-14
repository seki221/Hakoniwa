import type { CreatureState } from '../types/creature';
import { CREATURE_RADIUS } from '../simulation/systems/space';
import { getCreatureScale } from '../simulation/systems/lifeCycle';

type CreatureLayerProps = {
  creatures: CreatureState[];
};

const getCreatureColor = (creature: CreatureState): string => {
  if (creature.state === 'RESTING') {
    return '#7c8794';
    // やや灰色い青紫系
  }

  if (creature.state === 'DRINKING') {
    return '#5ba7d1';
    // 鈍い青系
  }

  if (creature.state === 'HEADING_TO_WATER') {
    return '#c9a24d';
    // 深い黄系
  }

  if (creature.state === 'EATING') {
    return '#79a857';
  }

  if (creature.state === 'HEADING_TO_FOOD') {
    return '#a6b95f';
  }

  return '#b3976d';
  // 灰みの橙系
};

export default function CreatureLayer({ creatures }: CreatureLayerProps) {
  return (
    <group>
      {creatures.map((creature) => (
        <mesh key={creature.id} position={creature.position} scale={getCreatureScale(creature)}>
          <sphereGeometry args={[CREATURE_RADIUS]} />
          <meshStandardMaterial color={getCreatureColor(creature)} />
        </mesh>
      ))}
    </group>
  );
}
