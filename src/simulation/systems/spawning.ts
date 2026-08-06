import * as THREE from 'three';

export type SpawnConfig = {
  fieldLimit: number;
  maxAttempts: number;
  y: number;
};

export type SpawnObstacle = {
  position: THREE.Vector3;
  minDistance: number;
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
  occupiedAreas: SpawnObstacle[],
  config: SpawnConfig,
): THREE.Vector3 | null => {
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const randomX = (Math.random() * 2 - 1) * config.fieldLimit;
    const randomZ = (Math.random() * 2 - 1) * config.fieldLimit;
    const candidatePos = new THREE.Vector3(randomX, config.y, randomZ);
    const isOccupied = occupiedAreas.some((area) =>
      isTooClose(candidatePos, area.position, area.minDistance),
    );

    if (!isOccupied) {
      return candidatePos;
    }
  }

  return null;
};
