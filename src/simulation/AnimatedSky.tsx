import { Sky } from '@react-three/drei';
import type { WorldTime } from '../types/WorldTime';
import { getDaylightAmount, getSunPosition } from './systems/sky';

type AnimatedSkyProps = {
  time: WorldTime;
};

const getBackgroundColor = (time: WorldTime): string => {
  const daylight = getDaylightAmount(time);

  if (daylight < 0.08) {
    return '#07111f';
  }

  if (daylight < 0.28) {
    return '#d08a63';
  }

  return '#87c7ff';
};

export function AnimatedSky({ time }: AnimatedSkyProps) {
  const daylight = getDaylightAmount(time);
  const sunPosition = getSunPosition(time);

  return (
    <>
      <color attach="background" args={[getBackgroundColor(time)]} />
      <ambientLight intensity={0.12 + daylight * 0.5} />
      <directionalLight
        position={sunPosition}
        intensity={0.15 + daylight * 1.2}
        color={daylight < 0.3 ? '#ffb17a' : '#ffffff'}
        castShadow
      />
      <Sky
        distance={450000}
        sunPosition={sunPosition}
        turbidity={8}
        rayleigh={daylight < 0.2 ? 0.55 : 2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
    </>
  );
}
