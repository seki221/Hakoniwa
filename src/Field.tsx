import { memo, useEffect, useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { createTerrainMesh } from './simulation/systems/terrainMesh';
import type { WaterSource } from './types/waterSource';

export const FIELD_SIZE = 200;
const FIELD_COLLIDER_HALF_SIZE = FIELD_SIZE / 2;

type FieldProps = {
  waterSources: WaterSource[];
};

const getWaterTerrainShapeKey = (waterSources: WaterSource[]): string =>
  waterSources
    .map((waterSource) =>
      [
        waterSource.id,
        waterSource.position.x.toFixed(2),
        waterSource.position.y.toFixed(2),
        waterSource.position.z.toFixed(2),
        waterSource.size[0].toFixed(2),
        waterSource.size[1].toFixed(2),
        waterSource.depth.toFixed(2),
      ].join(':'))
    .join('|');

function FieldComponent({ waterSources }: FieldProps) {
  const terrain = useMemo(() => createTerrainMesh({
    size: FIELD_SIZE,
    cellSize: 2,
    minHeight: -0.4,
    maxHeight: 0.6,
    waterSources,
  }), [waterSources]);

  useEffect(
    () => () => {
      terrain.geometry.dispose();

      if (Array.isArray(terrain.material)) {
        terrain.material.forEach((material) => material.dispose());
      } else {
        terrain.material.dispose();
      }
    },
    [terrain],
  );

  return (
    <RigidBody type="fixed" colliders={false}>
      <primitive object={terrain} receiveShadow />
      <CuboidCollider args={[FIELD_COLLIDER_HALF_SIZE, 5, FIELD_COLLIDER_HALF_SIZE]} position={[0, -2, 0]} />
    </RigidBody>
  );
}

export const Field = memo(
  FieldComponent,
  (previousProps, nextProps) =>
    getWaterTerrainShapeKey(previousProps.waterSources)
    === getWaterTerrainShapeKey(nextProps.waterSources),
);
