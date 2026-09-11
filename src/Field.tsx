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
import type { WaterBasin } from './types/waterSource';

export const FIELD_SIZE = TERRAIN_SIZE;

type FieldProps = {
  waterBasins: WaterBasin[];
};

const getWaterTerrainShapeKey = (waterBasins: WaterBasin[]): string =>
  waterBasins
    .map((waterBasin) =>
      [
        waterBasin.id,
        waterBasin.position.x.toFixed(2),
        waterBasin.position.y.toFixed(2),
        waterBasin.position.z.toFixed(2),
        waterBasin.size[0].toFixed(2),
        waterBasin.size[1].toFixed(2),
        waterBasin.depth.toFixed(2),
        waterBasin.rimHeight.toFixed(2),
      ].join(':'))
    .join('|');

function FieldComponent({ waterBasins }: FieldProps) {
  const terrain = useMemo(() => createTerrainMesh({
    size: FIELD_SIZE,
    cellSize: TERRAIN_CELL_SIZE,
    minHeight: TERRAIN_MIN_HEIGHT,
    maxHeight: TERRAIN_MAX_HEIGHT,
    waterBasins,
  }), [waterBasins]);

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
    getWaterTerrainShapeKey(previousProps.waterBasins)
    === getWaterTerrainShapeKey(nextProps.waterBasins),
);
