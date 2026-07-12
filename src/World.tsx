import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Field from './Field';
import Creature from './components/Creature';
import Watersource from './components/Water';

export default function World() {
  return (
    <div style={{ height: '500px', background: '#f0f0f0' }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        {/* 環境設定（光とカメラ操作） */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <OrbitControls />

        {/* 分離したコンポーネントを配置 */}
        <Field />
        <Creature />
        <Watersource />
      </Canvas>
    </div>
  );
}