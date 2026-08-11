import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import type { WorldTime } from '../types/WorldTime';
import { Moon } from './Moon';
import { NightStars } from './NightStars';
import { SkyGradient } from './SkyGradient';
import { getDaylightAmount, getSunPosition } from './systems/sky';

type AnimatedSkyProps = {
  time: WorldTime;
};

const NIGHT_COLOR = new THREE.Color('#020716');
const PRE_DAWN_COLOR = new THREE.Color('#14203a');
const DUSK_COLOR = new THREE.Color('#f0690a');
const DAY_COLOR = new THREE.Color('#87c7ff');

const mixColor = (
  from: THREE.Color,
  to: THREE.Color,
  amount: number,
): string =>
  from.clone().lerp(to, Math.max(0, Math.min(1, amount))).getStyle();

const getBackgroundColor = (time: WorldTime): string => {
  const daylight = getDaylightAmount(time);

  if (daylight <= 0) {
    return NIGHT_COLOR.getStyle();
  }

  if (daylight < 0.45) {
    const isEvening = time.hour >= 12;
    const twilightColor = isEvening ? DUSK_COLOR : PRE_DAWN_COLOR;

    return mixColor(NIGHT_COLOR, twilightColor, daylight / 0.45);
  }

  if (daylight < 0.9) {
    const isEvening = time.hour >= 12;
    const twilightColor = isEvening ? DUSK_COLOR : PRE_DAWN_COLOR;

    return mixColor(twilightColor, DAY_COLOR, (daylight - 0.45) / 0.45);
  }

  return DAY_COLOR.getStyle();
};

export function AnimatedSky({ time }: AnimatedSkyProps) {
  const daylight = getDaylightAmount(time);
  const sunPosition = getSunPosition(time);

  return (
    <>
      <color attach="background" args={[getBackgroundColor(time)]} />
      <SkyGradient time={time} />
      <ambientLight intensity={0.12 + daylight * 0.5} />
      <directionalLight
        position={sunPosition}
        intensity={0.15 + daylight * 1.2}
        color={daylight < 0.5 ? '#ff9f70' : '#ffffff'}
        castShadow
      />
      {daylight > 0.92 && (
        <Sky
          distance={450000}
          sunPosition={sunPosition}
          turbidity={7}
          rayleigh={2}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
        
      )}
      <NightStars time={time} />
      <Moon time={time} />
    </>
  );
}
