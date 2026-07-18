import * as THREE from 'three';

export type SpawnConfig = {
  fieldLimit: number;
  minSpacing: number;
  maxAttempts: number;
  y: number;
};

export const isTooClose = (
  pos1: THREE.Vector3,
  pos2: THREE.Vector3,
  minDistance: number,
): boolean => {
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;

  return Math.sqrt(dx * dx + dz * dz) < minDistance;
};

export const findSpawnPosition = (
  occupiedPositions: THREE.Vector3[],
  config: SpawnConfig,
): THREE.Vector3 | null => {
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const randomX = (Math.random() * 2 - 1) * config.fieldLimit;
    const randomZ = (Math.random() * 2 - 1) * config.fieldLimit;
    const candidatePos = new THREE.Vector3(randomX, config.y, randomZ);
    const isOccupied = occupiedPositions.some((position) =>
      isTooClose(candidatePos, position, config.minSpacing),
    );

    if (!isOccupied) {
      return candidatePos;
    }
  }

  return null;
};
