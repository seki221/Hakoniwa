import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Field from './Field';
import Amoeba from './Amoeba';

export default function World() {
  return (
    <div style={{ height: '500px', background: '#f0f0f0' }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <OrbitControls />
        <Field />
        <Amoeba initialPosition={[0, 0.5, 0]} />

        <mesh position={[5, 0.5, -5]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </Canvas>
    </div>
  );
}