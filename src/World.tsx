import { Canvas } from '@react-three/fiber';
import { Sky, Cloud, OrbitControls } from "@react-three/drei";
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
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <OrbitControls />
        {/* 空 */}
        <Sky
          distance={450000}
          sunPosition={[5, 1, 8]}
          inclination={0}
          azimuth={0.25}
        />
        {/* 雲 */}
        <Cloud
          position={[0, 15, -20]}
          bounds={[10, 2, 2]}
          opacity={0.5}
          speed={0.4}
          segments={20}
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
