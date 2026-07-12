import { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Creature } from '../ts/creature';

const FIELD_LIMIT = 7; // 壁の座標
const SPAWN_COUNT = 20; // 召喚したい数

export default function CreatureWorld() {
  // 名簿（リスト）を React の State で管理する
  const [creatures, setCreatures] = useState<Creature[]>([]);

  useEffect(() => {
    const initialCreatures: Creature[] = [];

    for (let i = 0; i < SPAWN_COUNT; i++) {
      const randomX = (Math.random() * 2 - 1) * FIELD_LIMIT;
      const randomZ = (Math.random() * 2 - 1) * FIELD_LIMIT; 

      initialCreatures.push({
        id: `creature_${i}`,
        name: `creature_${i}`,
        position: new THREE.Vector3(randomX, 0, randomZ),
        type: 'CREATURE',
        hp: 100,
        hunger: 100,
        class: 'GREEN',
        state: 'WANDERING',
      });
    }

    // 作った名簿をStateに登録
    setCreatures(initialCreatures);
  }, []);

  useFrame((_state, _delta) => {
    if (creatures.length === 0) return;

  });

  return (
    <group>
      {creatures.map((creature) => (
        <mesh key={creature.id} position={creature.position}>
          <sphereGeometry args={[0.3]} /> {/* 少し小ぶりに 0.3 */}
          <meshStandardMaterial color="green" />
        </mesh>
      ))}
    </group>
  );
}