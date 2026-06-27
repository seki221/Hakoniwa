import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three'; 
type AmoebaProps = {
  initialPosition?: [number, number, number]; 
};

export default function Amoeba({ initialPosition = [0, 0.5, 0] }: AmoebaProps) {
  
  const amoebaRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!amoebaRef.current) return;

    amoebaRef.current.position.x += (Math.random() - 0.5) * 0.05;
    amoebaRef.current.position.z += (Math.random() - 0.5) * 0.05;
  });

  return (
    <mesh ref={amoebaRef} position={initialPosition}>
      <sphereGeometry args={[0.5]} />
      <meshStandardMaterial color="purple" />
    </mesh>
  );
}