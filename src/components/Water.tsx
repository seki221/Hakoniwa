import { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Watersourcetype} from '../ts/water';

const SPAWN_COUNT = 3;
const FIELD_LIMIT = 7;

export default function Watersource() {
  const [watersources, setWatersources] = useState<Watersourcetype[]>([]);

  useEffect(() => {
    const initialWatersources: Watersourcetype[] = [];

    for (let i = 0; i < SPAWN_COUNT; i++) {
      const randomX = (Math.random() * 2 - 1) * FIELD_LIMIT;
      const randomZ = (Math.random() * 2 - 1) * FIELD_LIMIT;

      initialWatersources.push({
        id: `watersource_${i}`,
        name: `watersource_${i}`,
        position: new THREE.Vector3(randomX, 0.5, randomZ),
        size: [1, 1],
        type: 'WATERSOURCE',
        amount: 100,
        state: 'CLEAN',
      });
    }

    setWatersources(initialWatersources);
  }, []);

  useFrame((_state, _delta) => {
    if (watersources.length === 0) return
  });

  return (
    <group>
      {watersources.map((watersource) => (
        <mesh key={watersource.id} position={watersource.position}>
          <boxGeometry args={[watersource.size[0], 1, watersource.size[1]]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      ))}
    </group>
  );
}