import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Field } from './Field';
import { Physics } from '@react-three/rapier';
import {
  ConnectionOverlay,
  type ConnectionStatus,
} from './components/ConnectionOverlay';
import SimulationScene from './scene/SimulationScene';
import { FIELD_SIZE } from './Field';
import { ensureAnonymousSession } from './lib/auth';
import { loadOrCreateWorld, saveWorld } from './lib/worldPersistence';
import { createInitialWorld } from './simulation/createInitialWorld';
import { stepWorld } from './simulation/stepWorld';
import type { WorldState } from './types/world';

const SAVE_INTERVAL_MILLISECONDS = 30_000;

type WorldSceneProps = {
  initialWorld: WorldState;
  worldId: number;
  onSaveStatusChange: (status: ConnectionStatus, errorMessage?: string) => void;
};

function WorldScene({
  initialWorld,
  worldId,
  onSaveStatusChange,
}: WorldSceneProps) {
  const [world, setWorld] = useState(initialWorld);
  const currentWorld = useRef(initialWorld);
  const saveInProgress = useRef(false);

  useFrame((_, delta) => {
    setWorld((previousWorld) => {
      const nextWorld = stepWorld(previousWorld, delta);
      currentWorld.current = nextWorld;
      return nextWorld;
    });
  });

  useEffect(() => {
    const save = async () => {
      if (saveInProgress.current) {
        return;
      }

      saveInProgress.current = true;
      onSaveStatusChange('SAVING');

      try {
        await saveWorld(worldId, currentWorld.current);
        onSaveStatusChange('SAVED');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onSaveStatusChange('ERROR', message);
      } finally {
        saveInProgress.current = false;
      }
    };

    const intervalId = window.setInterval(save, SAVE_INTERVAL_MILLISECONDS);
    return () => window.clearInterval(intervalId);
  }, [onSaveStatusChange, worldId]);

  return (
    <>
      <OrbitControls
        minDistance={4}
        maxDistance={FIELD_SIZE + 5}
        maxPolarAngle={Math.PI}
      />
      <Physics gravity={[0, -9.81, 0]}>
        <Field waterBasins={world.waterBasins} />
      </Physics>
      <SimulationScene world={world} />
    </>
  );
}

export default function World() {
  const [loadedWorld, setLoadedWorld] = useState<{
    id: number;
    state: WorldState;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('CONNECTING');
  const [connectionError, setConnectionError] = useState<string>();

  useEffect(() => {
    let isActive = true;

    const connect = async () => {
      try {
        const user = await ensureAnonymousSession();
        const loaded = await loadOrCreateWorld(user, createInitialWorld);

        if (isActive) {
          setLoadedWorld({ id: loaded.worldId, state: loaded.world });
          setConnectionStatus('READY');
        }
      } catch (error) {
        if (isActive) {
          setConnectionStatus('ERROR');
          setConnectionError(
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    };

    void connect();
    return () => {
      isActive = false;
    };
  }, []);

  const handleSaveStatusChange = useCallback(
    (status: ConnectionStatus, errorMessage?: string) => {
      setConnectionStatus(status);
      setConnectionError(errorMessage);
    },
    [],
  );

  return (
    <div className="world-shell">
      {loadedWorld && (
        <Canvas
          shadows
          style={{ display: 'block' }}
          camera={{
            position: [5, 5, 5],
            fov: 50,
            near: 0.1,
            far: 2000,
          }}
        >
          <WorldScene
            initialWorld={loadedWorld.state}
            worldId={loadedWorld.id}
            onSaveStatusChange={handleSaveStatusChange}
          />
        </Canvas>
      )}
      <ConnectionOverlay
        status={connectionStatus}
        errorMessage={connectionError}
      />
    </div>
  );
}
