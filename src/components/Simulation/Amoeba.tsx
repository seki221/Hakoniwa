import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type AmoebaProps = {
  initialPosition?: [number, number, number];
};

type WaterSource = {
  position: THREE.Vector3;
};

const waterSources: WaterSource[] = [
  { position: new THREE.Vector3(5, 0.5, -5) },
];

const sensorRadius = 3;
const moveSpeed = 1.2;
const wanderSpeed = 0.7;
const wanderTurnInterval = 0.9;
const arrivalDistance = 0.12;
const fieldLimit = 7;

function lookAroundForWater(currentPos: THREE.Vector3, radius: number) {
  return waterSources.find((water) => currentPos.distanceTo(water.position) <= radius) ?? null;
}

function createRandomDirection() {
  return new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
}

export default function Amoeba({ initialPosition = [0, 0.5, 0] }: AmoebaProps) {
  const amoebaRef = useRef<THREE.Mesh>(null);
  const targetPositionRef = useRef<THREE.Vector3 | null>(null);
  const wanderDirectionRef = useRef(createRandomDirection());
  const elapsedRef = useRef(0);
  const nextTurnAtRef = useRef(wanderTurnInterval);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!amoebaRef.current) return;

    const currentPos = amoebaRef.current.position;
    // 毎フレーム周囲を見渡す（視界センサー）
    const foundWater = lookAroundForWater(currentPos, sensorRadius);

    if (foundWater !== null && targetPositionRef.current === null) {
      // 水を見つけたら、その「水が置かれている座標」をターゲットにセットする！
      targetPositionRef.current = foundWater.position.clone();
    }

    const targetPosition = targetPositionRef.current;

    // ターゲットが存在する時（見つけている時）だけ、そこへ向かう
    if (targetPosition !== null) {
      const distance = currentPos.distanceTo(targetPosition);

      if (distance > arrivalDistance) {
        direction.subVectors(targetPosition, currentPos).normalize();
        currentPos.addScaledVector(direction, moveSpeed * delta);
      }

      return;
    }

    // ターゲットを知らない（見つけていない）時は、ランダムに歩く
    elapsedRef.current += delta;

    if (elapsedRef.current >= nextTurnAtRef.current) {
      wanderDirectionRef.current = createRandomDirection();
      nextTurnAtRef.current = elapsedRef.current + wanderTurnInterval + Math.random() * 0.8;
    }

    const nextX = currentPos.x + wanderDirectionRef.current.x * wanderSpeed * delta;
    const nextZ = currentPos.z + wanderDirectionRef.current.z * wanderSpeed * delta;

    if (Math.abs(nextX) > fieldLimit || Math.abs(nextZ) > fieldLimit) {
      direction.set(-currentPos.x, 0, -currentPos.z).normalize();
      wanderDirectionRef.current.copy(direction);
    }

    currentPos.addScaledVector(wanderDirectionRef.current, wanderSpeed * delta);
  });

  return (
    <mesh ref={amoebaRef} position={initialPosition}>
      <sphereGeometry args={[0.5]} />
      <meshStandardMaterial color="purple" />
    </mesh>
  );
}
