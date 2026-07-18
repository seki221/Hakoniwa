import type { WaterSource } from '../types/waterSource';

type WaterSourceLayerProps = {
  waterSources: WaterSource[];
};

export default function WaterSourceLayer({ waterSources }: WaterSourceLayerProps) {
  return (
    <group>
      {waterSources.map((waterSource) => (
        <mesh key={waterSource.id} position={waterSource.position}>
          <boxGeometry args={[waterSource.size[0], 1, waterSource.size[1]]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      ))}
    </group>
  );
}