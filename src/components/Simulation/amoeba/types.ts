export type AmoebaSpecies = 'green' | 'red' | 'black';

export type VectorTuple = [number, number, number];

export type HydrationIntent = 'none' | 'seek-water' | 'avoid-water';

export type SimulationAgent = {
  id: string;
  species: AmoebaSpecies;
  position: VectorTuple;
  thirst: number;
  fullness: number;
  targetPosition: VectorTuple | null;
  hydrationIntent: HydrationIntent;
  age: number;
  reproductionCooldown: number;
  wanderDirection: VectorTuple;
  wanderTimer: number;
};

export type WaterSource = {
  id: string;
  position: VectorTuple;
  size: [number, number];
};

export type StepSimulationParams = {
  agents: SimulationAgent[];
  waterSources: WaterSource[];
  delta: number;
  createId: (species: AmoebaSpecies) => string;
};
