import { memo, useEffect, useMemo } from 'react';
import { MeshCollider, RigidBody } from '@react-three/rapier';
import {
  TERRAIN_CELL_SIZE,
  TERRAIN_MAX_HEIGHT,
  TERRAIN_MIN_HEIGHT,
  TERRAIN_SIZE,
} from './simulation/systems/environment';
import {
  createTerrainMesh,
} from './simulation/systems/terrainMesh';
import type { WaterSource } from './types/waterSource';

export const FIELD_SIZE = TERRAIN_SIZE;

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
    cellSize: TERRAIN_CELL_SIZE,
    minHeight: TERRAIN_MIN_HEIGHT,
    maxHeight: TERRAIN_MAX_HEIGHT,
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
      <MeshCollider type="trimesh">
        <primitive object={terrain} receiveShadow />
      </MeshCollider>
    </RigidBody>
  );
}

export const Field = memo(
  FieldComponent,
  (previousProps, nextProps) =>
    getWaterTerrainShapeKey(previousProps.waterSources)
    === getWaterTerrainShapeKey(nextProps.waterSources),
);
