import * as THREE from 'three';
import type {
  AmoebaSpecies,
  HydrationIntent,
  SimulationAgent,
  StepSimulationParams,
  VectorTuple,
  WaterSource,
} from './types';

const yPosition = 0.5;
const fieldLimit = 8;
const waterSenseRadius = 3;
const waterArriveDistance = 0.08;
const eatDistance = 0.55;
const guardDistance = 0.65;
const maxAgents = 44;

const speciesRules: Record<AmoebaSpecies, {
  speed: number;
  thirstRate: number;
  hungerRate: number;
  senseRadius: number;
}> = {
  green: { speed: 1.05, thirstRate: 0.035, hungerRate: 0.015, senseRadius: 4.2 },
  red: { speed: 3.25, thirstRate: 0.03, hungerRate: 0.04, senseRadius: 5.5 },
  black: { speed: 1.18, thirstRate: 0.028, hungerRate: 0.02, senseRadius: 5 },
};

function toVector(position: VectorTuple) {
  return new THREE.Vector3(position[0], yPosition, position[2]);
}

function toTuple(position: THREE.Vector3): VectorTuple {
  return [position.x, yPosition, position.z];
}

function directionToTuple(direction: THREE.Vector3): VectorTuple {
  return [direction.x, 0, direction.z];
}

function toDirection(direction: VectorTuple) {
  return new THREE.Vector3(direction[0], 0, direction[2]);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampToField(position: THREE.Vector3) {
  position.x = THREE.MathUtils.clamp(position.x, -fieldLimit, fieldLimit);
  position.y = yPosition;
  position.z = THREE.MathUtils.clamp(position.z, -fieldLimit, fieldLimit);
  return position;
}

function randomDirection(): VectorTuple {
  const direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);

  if (direction.lengthSq() === 0) {
    return [1, 0, 0];
  }

  direction.normalize();
  return directionToTuple(direction);
}

function findNearest(
  current: SimulationAgent,
  agents: SimulationAgent[],
  species: AmoebaSpecies,
) {
  const currentPosition = toVector(current.position);
  let nearest: SimulationAgent | null = null;
  let nearestDistance = Infinity;

  for (const agent of agents) {
    if (agent.id === current.id || agent.species !== species) continue;

    const distance = currentPosition.distanceTo(toVector(agent.position));
    if (distance < nearestDistance) {
      nearest = agent;
      nearestDistance = distance;
    }
  }

  return { agent: nearest, distance: nearestDistance };
}

function getNearestPointOnWater(currentPosition: THREE.Vector3, water: WaterSource) {
  const waterPosition = toVector(water.position);
  const [width, depth] = water.size;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return new THREE.Vector3(
    THREE.MathUtils.clamp(currentPosition.x, waterPosition.x - halfWidth, waterPosition.x + halfWidth),
    yPosition,
    THREE.MathUtils.clamp(currentPosition.z, waterPosition.z - halfDepth, waterPosition.z + halfDepth),
  );
}

function findNearestWater(current: SimulationAgent, waterSources: WaterSource[], radius = Infinity) {
  const currentPosition = toVector(current.position);
  let nearest: WaterSource | null = null;
  let nearestDistance = Infinity;
  let nearestPoint: VectorTuple | null = null;

  for (const water of waterSources) {
    const waterPoint = getNearestPointOnWater(currentPosition, water);
    const distance = currentPosition.distanceTo(waterPoint);

    if (distance < nearestDistance && distance <= radius) {
      nearest = water;
      nearestDistance = distance;
      nearestPoint = toTuple(waterPoint);
    }
  }

  return { water: nearest, distance: nearestDistance, nearestPoint };
}

function moveToward(current: THREE.Vector3, target: THREE.Vector3, speed: number, delta: number) {
  const direction = target.clone().sub(current);

  if (direction.lengthSq() === 0) return current;

  direction.normalize();
  return current.addScaledVector(direction, speed * delta);
}

function moveAwayFrom(current: THREE.Vector3, target: THREE.Vector3, speed: number, delta: number) {
  const direction = current.clone().sub(target);

  if (direction.lengthSq() === 0) {
    direction.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  }

  direction.normalize();
  return current.addScaledVector(direction, speed * delta);
}

function wander(agent: SimulationAgent, current: THREE.Vector3, speed: number, delta: number) {
  let nextDirection = agent.wanderDirection;
  let nextTimer = agent.wanderTimer - delta;

  if (nextTimer <= 0) {
    nextDirection = randomDirection();
    nextTimer = 0.6 + Math.random() * 1.1;
  }

  const direction = toDirection(nextDirection).normalize();
  const nextPosition = current.addScaledVector(direction, speed * 0.55 * delta);

  if (Math.abs(nextPosition.x) >= fieldLimit || Math.abs(nextPosition.z) >= fieldLimit) {
    nextDirection = directionToTuple(new THREE.Vector3(-nextPosition.x, 0, -nextPosition.z).normalize());
  }

  return { position: nextPosition, wanderDirection: nextDirection, wanderTimer: nextTimer };
}

function chooseHydrationMove(agent: SimulationAgent, waterSources: WaterSource[]) {
  const visibleWater = findNearestWater(agent, waterSources, waterSenseRadius);
  const closeWater = findNearestWater(agent, waterSources, 1.7);

  if (agent.thirst >= 0.55 && visibleWater.water !== null) {
    return {
      intent: 'seek-water' as HydrationIntent,
      targetPosition: visibleWater.nearestPoint,
      waterDistance: visibleWater.distance,
    };
  }

  if (agent.thirst <= 0.25 && closeWater.water !== null) {
    return {
      intent: 'avoid-water' as HydrationIntent,
      targetPosition: closeWater.water.position,
      waterDistance: closeWater.distance,
    };
  }

  return {
    intent: 'none' as HydrationIntent,
    targetPosition: null,
    waterDistance: Infinity,
  };
}

function moveAgent(
  agent: SimulationAgent,
  snapshot: SimulationAgent[],
  waterSources: WaterSource[],
  delta: number,
) {
  const rules = speciesRules[agent.species];
  const current = toVector(agent.position);
  const hydration = chooseHydrationMove(agent, waterSources);
  let targetPosition: VectorTuple | null = null;
  let hydrationIntent = hydration.intent;
  let nextPosition: THREE.Vector3;
  let nextWanderDirection = agent.wanderDirection;
  let nextWanderTimer = agent.wanderTimer;

  const red = findNearest(agent, snapshot, 'red');
  const green = findNearest(agent, snapshot, 'green');
  const black = findNearest(agent, snapshot, 'black');

  if (agent.species === 'green' && red.agent !== null && red.distance <= rules.senseRadius) {
    targetPosition = red.agent.position;
    nextPosition = moveAwayFrom(current, toVector(red.agent.position), rules.speed * 1.2, delta);
  } else if (agent.species === 'red' && black.agent !== null && black.distance <= 2.1) {
    targetPosition = black.agent.position;
    nextPosition = moveAwayFrom(current, toVector(black.agent.position), rules.speed * 1.1, delta);
  } else if (
    agent.species === 'black'
    && red.agent !== null
    && green.agent !== null
    && toVector(red.agent.position).distanceTo(toVector(green.agent.position)) <= 3.7
  ) {
    targetPosition = red.agent.position;
    nextPosition = moveToward(current, toVector(red.agent.position), rules.speed * 1.25, delta);
  } else if (hydration.intent === 'seek-water' && hydration.targetPosition !== null) {
    targetPosition = hydration.targetPosition;
    nextPosition = moveToward(current, toVector(hydration.targetPosition), rules.speed, delta);
  } else if (hydration.intent === 'avoid-water' && hydration.targetPosition !== null) {
    targetPosition = hydration.targetPosition;
    nextPosition = moveAwayFrom(current, toVector(hydration.targetPosition), rules.speed * 0.7, delta);
  } else if (agent.species === 'red' && green.agent !== null && green.distance <= rules.senseRadius) {
    targetPosition = green.agent.position;
    nextPosition = moveToward(current, toVector(green.agent.position), rules.speed, delta);
  } else if (agent.species === 'black' && green.agent !== null) {
    const greenPosition = toVector(green.agent.position);

    targetPosition = green.agent.position;
    if (green.distance > 1.8) {
      nextPosition = moveToward(current, greenPosition, rules.speed * 0.8, delta);
    } else if (green.distance < 0.9) {
      nextPosition = moveAwayFrom(current, greenPosition, rules.speed * 0.55, delta);
    } else {
      const aroundGreen = current.clone().sub(greenPosition);
      aroundGreen.set(-aroundGreen.z, 0, aroundGreen.x).normalize();
      nextPosition = current.addScaledVector(aroundGreen, rules.speed * 0.45 * delta);
    }
  } else {
    const wandered = wander(agent, current, rules.speed, delta);
    nextPosition = wandered.position;
    nextWanderDirection = wandered.wanderDirection;
    nextWanderTimer = wandered.wanderTimer;
    hydrationIntent = 'none';
  }

  clampToField(nextPosition);

  return {
    ...agent,
    position: toTuple(nextPosition),
    targetPosition,
    hydrationIntent,
    wanderDirection: nextWanderDirection,
    wanderTimer: nextWanderTimer,
  };
}

export function createAgent(
  id: string,
  species: AmoebaSpecies,
  position: VectorTuple,
): SimulationAgent {
  return {
    id,
    species,
    position,
    thirst: 0.15 + Math.random() * 0.2,
    fullness: 0.65 + Math.random() * 0.25,
    targetPosition: null,
    hydrationIntent: 'none',
    age: 0,
    reproductionCooldown: 2 + Math.random() * 3,
    wanderDirection: randomDirection(),
    wanderTimer: Math.random() * 1.2,
  };
}

function spawnNear(
  createId: (species: AmoebaSpecies) => string,
  species: AmoebaSpecies,
  position: VectorTuple,
) {
  const offset = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)
    .normalize()
    .multiplyScalar(0.55 + Math.random() * 0.45);
  const spawnPosition = clampToField(toVector(position).add(offset));

  return createAgent(createId(species), species, toTuple(spawnPosition));
}

export function stepSimulation({
  agents,
  waterSources,
  delta,
  createId,
}: StepSimulationParams) {
  const safeDelta = Math.min(delta, 0.05);
  const snapshot = agents.map((agent) => ({ ...agent }));
  const movedAgents = snapshot
    .map((agent) => {
      const rules = speciesRules[agent.species];
      const hydrated = {
        ...agent,
        thirst: clamp01(agent.thirst + rules.thirstRate * safeDelta),
        fullness: clamp01(agent.fullness - rules.hungerRate * safeDelta),
        age: agent.age + safeDelta,
        reproductionCooldown: Math.max(0, agent.reproductionCooldown - safeDelta),
      };

      return moveAgent(hydrated, snapshot, waterSources, safeDelta);
    })
    .filter((agent) => agent.thirst < 1 && agent.fullness > 0);

  const removedIds = new Set<string>();
  const spawns: SimulationAgent[] = [];
  const nextAgents = movedAgents.map((agent) => ({ ...agent }));

  for (const agent of nextAgents) {
    const water = findNearestWater(agent, waterSources, waterArriveDistance);

    if (water.water === null) continue;

    agent.thirst = clamp01(agent.thirst - 0.9 * safeDelta);

    if (agent.species === 'green') {
      agent.fullness = clamp01(agent.fullness + 0.08 * safeDelta);
    }

    if (
      agent.species === 'green'
      && agent.thirst <= 0.2
      && agent.fullness > 0.35
      && agent.reproductionCooldown <= 0
      && nextAgents.length + spawns.length < maxAgents
    ) {
      agent.reproductionCooldown = 7 + Math.random() * 4;
      agent.fullness = clamp01(agent.fullness - 0.18);
      spawns.push(spawnNear(createId, 'green', agent.position));
    }
  }

  for (const agent of nextAgents) {
    if (agent.species !== 'red' || removedIds.has(agent.id)) continue;

    const prey = findNearest(agent, nextAgents.filter((candidate) => !removedIds.has(candidate.id)), 'green');

    if (prey.agent !== null && prey.distance <= eatDistance) {
      removedIds.add(prey.agent.id);
      agent.fullness = clamp01(agent.fullness + 0.55);

      if (agent.reproductionCooldown <= 0 && nextAgents.length + spawns.length < maxAgents) {
        agent.reproductionCooldown = 9 + Math.random() * 5;
        agent.fullness = clamp01(agent.fullness - 0.3);
        spawns.push(spawnNear(createId, 'red', agent.position));
      }
    }
  }

  for (const agent of nextAgents) {
    if (agent.species !== 'black' || removedIds.has(agent.id)) continue;

    const enemy = findNearest(agent, nextAgents.filter((candidate) => !removedIds.has(candidate.id)), 'red');

    if (enemy.agent !== null && enemy.distance <= guardDistance) {
      removedIds.add(enemy.agent.id);
      agent.fullness = clamp01(agent.fullness + 0.18);
    }
  }

  return nextAgents
    .filter((agent) => !removedIds.has(agent.id))
    .concat(spawns);
}
