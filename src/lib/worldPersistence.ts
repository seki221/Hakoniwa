import * as THREE from 'three';
import type { User } from '@supabase/supabase-js';
import type { WorldState } from '../types/world';
import { supabase } from './supabase';

const SNAPSHOTS_TO_KEEP = 5;

type StoredVector3 = {
  x: number;
  y: number;
  z: number;
};

type StoredWorldState = Omit<
  WorldState,
  'creatures' | 'grassBlades' | 'plantFoods' | 'waterBasins'
> & {
  creatures: Array<
    Omit<WorldState['creatures'][number], 'position' | 'velocity' | 'wanderDirection'> & {
      position: StoredVector3;
      velocity: StoredVector3;
      wanderDirection: StoredVector3;
    }
  >;
  grassBlades: Array<
    Omit<WorldState['grassBlades'][number], 'position' | 'normal'> & {
      position: StoredVector3;
      normal: StoredVector3;
    }
  >;
  plantFoods: Array<
    Omit<WorldState['plantFoods'][number], 'position'> & {
      position: StoredVector3;
    }
  >;
  waterBasins: Array<
    Omit<WorldState['waterBasins'][number], 'position'> & {
      position: StoredVector3;
    }
  >;
};

export type LoadedWorld = {
  worldId: number;
  world: WorldState;
};

const toStoredVector = (vector: THREE.Vector3): StoredVector3 => ({
  x: vector.x,
  y: vector.y,
  z: vector.z,
});

const fromStoredVector = (vector: StoredVector3): THREE.Vector3 =>
  new THREE.Vector3(vector.x, vector.y, vector.z);

const serializeWorld = (world: WorldState): StoredWorldState => ({
  ...world,
  creatures: world.creatures.map((creature) => ({
    ...creature,
    position: toStoredVector(creature.position),
    velocity: toStoredVector(creature.velocity),
    wanderDirection: toStoredVector(creature.wanderDirection),
  })),
  grassBlades: world.grassBlades.map((blade) => ({
    ...blade,
    position: toStoredVector(blade.position),
    normal: toStoredVector(blade.normal),
  })),
  plantFoods: world.plantFoods.map((food) => ({
    ...food,
    position: toStoredVector(food.position),
  })),
  waterBasins: world.waterBasins.map((basin) => ({
    ...basin,
    position: toStoredVector(basin.position),
  })),
});

const isStoredWorld = (value: unknown): value is StoredWorldState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredWorldState>;
  return Array.isArray(candidate.creatures)
    && Array.isArray(candidate.grassBlades)
    && Array.isArray(candidate.plantFoods)
    && Array.isArray(candidate.waterBasins)
    && Array.isArray(candidate.waterSources)
    && Boolean(candidate.time)
    && Boolean(candidate.weather);
};

const deserializeWorld = (stored: StoredWorldState): WorldState => ({
  ...stored,
  creatures: stored.creatures.map((creature) => ({
    ...creature,
    position: fromStoredVector(creature.position),
    velocity: fromStoredVector(creature.velocity),
    wanderDirection: fromStoredVector(creature.wanderDirection),
  })),
  grassBlades: stored.grassBlades.map((blade) => ({
    ...blade,
    position: fromStoredVector(blade.position),
    normal: fromStoredVector(blade.normal),
  })),
  plantFoods: stored.plantFoods.map((food) => ({
    ...food,
    position: fromStoredVector(food.position),
  })),
  waterBasins: stored.waterBasins.map((basin) => ({
    ...basin,
    position: fromStoredVector(basin.position),
  })),
});

const insertSnapshot = async (
  worldId: number,
  world: WorldState,
): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabaseの接続情報が設定されていません。');
  }

  const { error } = await supabase.from('world_snapshots').insert({
    world_id: worldId,
    tick: world.time.tick,
    state: serializeWorld(world),
  });

  if (error) {
    throw error;
  }
};

const loadOrCreateWorldInternal = async (
  user: User,
  createInitialWorld: () => WorldState,
): Promise<LoadedWorld> => {
  if (!supabase) {
    throw new Error('Supabaseの接続情報が設定されていません。');
  }

  const { data: existingWorld, error: worldError } = await supabase
    .from('worlds')
    .select('id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (worldError) {
    throw worldError;
  }

  let worldId = existingWorld?.id as number | undefined;

  if (!worldId) {
    const initialWorld = createInitialWorld();
    const { data: createdWorld, error: createError } = await supabase
      .from('worlds')
      .insert({
        owner_id: user.id,
        name: 'Hakoniwa',
        tick: initialWorld.time.tick,
        elapsed_seconds: initialWorld.time.elapsedSeconds,
        day: initialWorld.time.day,
        hour: initialWorld.time.hour,
        minute: initialWorld.time.minute,
        time_speed: initialWorld.time.speed,
        weather: initialWorld.weather,
      })
      .select('id')
      .single();

    if (createError) {
      throw createError;
    }

    worldId = createdWorld.id as number;
    await insertSnapshot(worldId, initialWorld);
    return { worldId, world: initialWorld };
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from('world_snapshots')
    .select('state')
    .eq('world_id', worldId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError) {
    throw snapshotError;
  }

  if (snapshot && isStoredWorld(snapshot.state)) {
    return { worldId, world: deserializeWorld(snapshot.state) };
  }

  const initialWorld = createInitialWorld();
  await insertSnapshot(worldId, initialWorld);
  return { worldId, world: initialWorld };
};

const pendingLoads = new Map<string, Promise<LoadedWorld>>();

export const loadOrCreateWorld = (
  user: User,
  createInitialWorld: () => WorldState,
): Promise<LoadedWorld> => {
  const existingLoad = pendingLoads.get(user.id);
  if (existingLoad) {
    return existingLoad;
  }

  const load = loadOrCreateWorldInternal(user, createInitialWorld).finally(() => {
    pendingLoads.delete(user.id);
  });
  pendingLoads.set(user.id, load);
  return load;
};

export const saveWorld = async (
  worldId: number,
  world: WorldState,
): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabaseの接続情報が設定されていません。');
  }

  const { error: updateError } = await supabase
    .from('worlds')
    .update({
      tick: world.time.tick,
      elapsed_seconds: world.time.elapsedSeconds,
      day: world.time.day,
      hour: world.time.hour,
      minute: world.time.minute,
      time_speed: world.time.speed,
      weather: world.weather,
      updated_at: new Date().toISOString(),
    })
    .eq('id', worldId);

  if (updateError) {
    throw updateError;
  }

  await insertSnapshot(worldId, world);

  const { data: oldSnapshots, error: listError } = await supabase
    .from('world_snapshots')
    .select('id')
    .eq('world_id', worldId)
    .order('created_at', { ascending: false })
    .range(SNAPSHOTS_TO_KEEP, SNAPSHOTS_TO_KEEP + 99);

  if (listError) {
    throw listError;
  }

  if (oldSnapshots.length > 0) {
    const { error: deleteError } = await supabase
      .from('world_snapshots')
      .delete()
      .in('id', oldSnapshots.map(({ id }) => id));

    if (deleteError) {
      throw deleteError;
    }
  }
};
