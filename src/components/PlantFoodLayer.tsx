import { memo } from 'react';
import type { PlantFood } from '../types/vegetation';

type PlantFoodLayerProps = {
  plantFoods: PlantFood[];
};

function PlantFoodLayerComponent({ plantFoods }: PlantFoodLayerProps) {
  return (
    <group>
      {plantFoods.map((plantFood) => plantFood.isAvailable && (
        <mesh key={plantFood.id} position={plantFood.position}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <meshStandardMaterial color={plantFood.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default memo(PlantFoodLayerComponent);
