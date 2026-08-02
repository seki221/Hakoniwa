import { Canvas } from '@react-three/fiber';
import { OrbitControls } from "@react-three/drei";
import { Field } from './Field';
// import { Stars } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import SimulationScene from './scene/SimulationScene';
export default function World() {
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
        <OrbitControls />
          {/* 地面 */}
        <Physics gravity={[0, -9.81, 0]}>
          <Field />
        </Physics>
        <SimulationScene />
      </Canvas>
    </div>
  );
}
