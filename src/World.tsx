import { Canvas } from '@react-three/fiber';
import { OrbitControls } from "@react-three/drei";
import { Field } from './Field';
import { Physics } from "@react-three/rapier";
import SimulationScene from './scene/SimulationScene';
export default function World() {
  const FIELD_SIZE = 300;
  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#f0f0f0' }}>
      <Canvas
          shadows
          style={{ display: 'block' }}
          camera={{
            position: [5, 5, 5],
            fov: 50,
            near: 0.1,
            far: 2000,
          }}
        >
        {/* 環境設定（光とカメラ操作） */}
        <OrbitControls
          minDistance={4}
          maxDistance={FIELD_SIZE/2 + 5}
          maxPolarAngle={Math.PI / 2.15}
        />
          {/* 地面 */}
        <Physics gravity={[0, -9.81, 0]}>
          <Field />
        </Physics>
        <SimulationScene />
      </Canvas>
    </div>
  );
}
