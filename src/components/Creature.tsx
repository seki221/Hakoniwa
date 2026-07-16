import { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Creature } from '../ts/creature';

const FIELD_LIMIT = 7;
const SPAWN_COUNT = 20;

const isTooClose = (pos1: THREE.Vector3, pos2: THREE.Vector3, minDistance: number): boolean => {
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dz * dz) < minDistance;
};

export default function Creature() {
  const [creatures, setCreatures] = useState<Creature[]>([]);

  useEffect(() => {
    const initialCreatures: Creature[] = [];
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
      isOverlap = initialCreatures.some((existing) =>
        isTooClose(candidatePos, existing.position, minSpacing)
      );

      attempts++;
    } while (isOverlap && attempts < maxAttempts);
      initialCreatures.push({
        id: `creature_${i}`,
        name: `creature_${i}`,
        position: new THREE.Vector3(randomX, 0.15, randomZ),
        type: 'CREATURE',
        hp: 100,
        hunger: 100,
        thirst: 0,
        Affiliation: 'GREEN',
        state: 'WANDERING',
      });
    }

    setCreatures(initialCreatures);
  }, []);

  useFrame((_state, _delta) => {
    if (creatures.length === 0) return;

  });

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