import { Cloud } from '@react-three/drei';
import type { WeatherState } from '../types/Weather';

const CLOUD_PRESETS = {
  SUNNY: {
    clusters: 3,
    opacity: 0.18,
    bounds: [7, 1.8, 4],
    height: 36,
    spread: 78,
    depth: 56,
    segments: 14,
  },
  CLOUDY: {
    clusters: 16,
    opacity: 0.42,
    bounds: [18, 3.4, 9],
    height: 34,
    spread: 115,
    depth: 78,
    segments: 20,
  },
  RAIN: {
    clusters: 22,
    opacity: 0.62,
    bounds: [22, 4.5, 11],
    height: 30,
    spread: 125,
    depth: 86,
    segments: 18,
  },
  FOG: {
    clusters: 8,
    opacity: 0.24,
    bounds: [16, 2.8, 10],
    height: 22,
    spread: 105,
    depth: 72,
    segments: 16,
  },
} as const;

const CLOUD_SPEED_BY_WIND = {
  CALM: 0.12,
  BREEZE: 0.4,
  GALE: 0.85,
  STORM: 1.3,
} as const;

type WeatherCloudLayerProps = {
  weather: WeatherState;
};

const getCloudPosition = (
  index: number,
  spread: number,
  depth: number,
  height: number,
): [number, number, number] => {
  const row = Math.floor(index / 4);
  const column = index % 4;
  const xOffset = column % 2 === 0 ? -spread * 0.42 : spread * 0.42;
  const x = -spread * 0.5 + (column / 3) * spread + xOffset * 0.18;
  const z = -depth * 0.5 + ((row % 6) / 5) * depth;
  const y = height + ((index * 7) % 5) * 1.5;

  return [x, y, z];
};

export default function WeatherCloudLayer({ weather }: WeatherCloudLayerProps) {
  const preset = CLOUD_PRESETS[weather.condition];
  const cloudSpeed = CLOUD_SPEED_BY_WIND[weather.wind];
  const clouds = Array.from({ length: preset.clusters }, (_, index) => index);

  return (
    <>
      {weather.condition === 'FOG' && (
        <fog attach="fog" args={['#b9c2c7', 7, 42]} />
      )}
      {clouds.map((index) => (
        <Cloud
          key={`${weather.condition}_${index}`}
          position={getCloudPosition(index, preset.spread, preset.depth, preset.height)}
          bounds={preset.bounds}
          opacity={preset.opacity}
          speed={cloudSpeed}
          segments={preset.segments}
        />
      ))}
    </>
  );
}