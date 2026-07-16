import { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Watersourcetype} from '../ts/water';

const SPAWN_COUNT = 3;
const FIELD_LIMIT = 7;

const isTooClose = (pos1: THREE.Vector3, pos2: THREE.Vector3, minDistance: number): boolean => {
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dz * dz) < minDistance;
};


export default function Watersource() {
  const [watersources, setWatersources] = useState<Watersourcetype[]>([]);

  useEffect(() => {
    const initialWatersources: Watersourcetype[] = [];
    const minSpacing = 2.5;
    for (let i = 0; i < SPAWN_COUNT; i++) {
      let randomX = 0;
      let randomZ = 0;
      let candidatePos = new THREE.Vector3();
      let isOverlap = false;
      let attempts = 0;
      const maxAttempts = 100;

      do {
        randomX = (Math.random() * 2 - 1) * FIELD_LIMIT;
        randomZ = (Math.random() * 2 - 1) * FIELD_LIMIT;
        candidatePos.set(randomX, -0.5, randomZ);

        isOverlap = initialWatersources.some((existing) =>
          isTooClose(candidatePos, existing.position, minSpacing)
        );

        attempts++;
      } while (isOverlap && attempts < maxAttempts);

      initialWatersources.push({
        id: `watersource_${i}`,
        name: `watersource_${i}`,
        position: candidatePos.clone(),
        size: [2, 2],
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