import { Cloud } from '@react-three/drei';
import CreatureLayer from '../components/CreatureLayer';
import GrassLayer from '../components/GrassLayer';
import WaterSourceLayer from '../components/WaterSourceLayer';
import { AnimatedSky } from '../simulation/AnimatedSky';
import { getDaylightAmount } from '../simulation/systems/sky';
import type { WorldState } from '../types/world';

type SimulationSceneProps = {
  world: WorldState;
};

const CLOUD_OPACITY_BY_WEATHER = {
  SUNNY: 0.18,
  CLOUDY: 0.58,
  RAIN: 0.78,
  FOG: 0.72,
} as const;

const CLOUD_SPEED_BY_WIND = {
  CALM: 0.12,
  BREEZE: 0.4,
  GALE: 0.85,
  STORM: 1.3,
} as const;

export default function SimulationScene({ world }: SimulationSceneProps) {
  const daylight = getDaylightAmount(world.time);
  const cloudOpacity = Math.min(
    0.9,
    CLOUD_OPACITY_BY_WEATHER[world.weather.condition] + daylight * 0.18,
  );

  return (
    <>
      <AnimatedSky time={world.time} />
      {world.weather.condition === 'FOG' && (
        <fog attach="fog" args={['#b9c2c7', 8, 36]} />
      )}
      <Cloud
        position={[0, 15, -20]}
        bounds={[10, 2, 2]}
        opacity={cloudOpacity}
        speed={CLOUD_SPEED_BY_WIND[world.weather.wind]}
        segments={20}
      />
      <GrassLayer grassBlades={world.grassBlades} />
      <CreatureLayer creatures={world.creatures} />
      <WaterSourceLayer waterSources={world.waterSources} />
    </>
  );
}
