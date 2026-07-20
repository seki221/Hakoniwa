import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import waterTextureSrc from '../assets/water.png';
import type { WaterSource } from '../types/waterSource';

type WaterSourceLayerProps = {
  waterSources: WaterSource[];
};

export default function WaterSourceLayer({ waterSources }: WaterSourceLayerProps) {
  const waterTexture = useTexture(waterTextureSrc);

  return (
    <group>
      {waterSources.map((waterSource) => (
        <mesh key={waterSource.id} position={waterSource.position}>
          <boxGeometry args={[waterSource.size[0], 1, waterSource.size[1]]} />
          <meshStandardMaterial
            map={waterTexture}
            map-colorSpace={THREE.SRGBColorSpace}
            map-wrapS={THREE.RepeatWrapping}
            map-wrapT={THREE.RepeatWrapping}
            color="white"
          />
        </mesh>
      ))}
    </group>
  );
}
