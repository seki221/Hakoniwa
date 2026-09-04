import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { GrassBlade } from '../types/vegetation';

type GrassLayerProps = {
  grassBlades: GrassBlade[];
};

const UP = new THREE.Vector3(0, 1, 0);

function createGrassBladeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -0.5, 0, 0,
    0.5, 0, 0,
    0.12, 1, 0,
    -0.12, 1, 0,
    0, 0, -0.5,
    0, 0, 0.5,
    0, 1, 0.12,
    0, 1, -0.12,
  ]);
  const indices = [
    0, 1, 2,
    0, 2, 3,
    4, 5, 6,
    4, 6, 7,
  ];

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createGrassMesh(grassBlades: GrassBlade[]): THREE.InstancedMesh | null {
  if (grassBlades.length === 0) {
    return null;
  }

  const geometry = createGrassBladeGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, grassBlades.length);
  const dummy = new THREE.Object3D();
  const terrainQuaternion = new THREE.Quaternion();
  const yawQuaternion = new THREE.Quaternion();
  const leanQuaternion = new THREE.Quaternion();
  const color = new THREE.Color();

  grassBlades.forEach((blade, index) => {
    terrainQuaternion.setFromUnitVectors(UP, blade.normal);
    yawQuaternion.setFromAxisAngle(UP, blade.rotationY);
    leanQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), blade.lean);

    dummy.position.copy(blade.position);
    dummy.quaternion
      .copy(terrainQuaternion)
      .multiply(yawQuaternion)
      .multiply(leanQuaternion);
    dummy.scale.set(blade.width, blade.height, blade.width);
    dummy.updateMatrix();

    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, color.set(blade.color));
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor?.setUsage(THREE.StaticDrawUsage);

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  mesh.computeBoundingSphere();
  mesh.name = 'GrassLayer';
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  return mesh;
}

function GrassLayerComponent({ grassBlades }: GrassLayerProps) {
  const grassMesh = useMemo(() => createGrassMesh(grassBlades), [grassBlades]);

  useEffect(
    () => () => {
      grassMesh?.geometry.dispose();

      if (Array.isArray(grassMesh?.material)) {
        grassMesh.material.forEach((material) => material.dispose());
      } else {
        grassMesh?.material.dispose();
      }
    },
    [grassMesh],
  );

  if (!grassMesh) {
    return null;
  }

  return <primitive object={grassMesh} />;
}

export default memo(GrassLayerComponent);
