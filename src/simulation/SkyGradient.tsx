import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldTime } from '../types/WorldTime';
import { getDaylightAmount } from './systems/sky';

const SKY_RADIUS = 420;

const SKY_GRADIENT_VERTEX_SHADER = `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_GRADIENT_FRAGMENT_SHADER = `
  uniform vec3 zenithColor;
  uniform vec3 horizonColor;
  uniform vec3 lowerColor;
  uniform vec3 glowColor;
  uniform float glowAmount;
  varying vec3 vDirection;

  void main() {
    float height = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
    float horizonBlend = smoothstep(0.08, 0.62, height);
    float lowerBlend = smoothstep(0.0, 0.3, height);
    vec3 lowerToHorizon = mix(lowerColor, horizonColor, lowerBlend);
    vec3 skyColor = mix(lowerToHorizon, zenithColor, horizonBlend);
    float horizonGlow = exp(-abs(vDirection.y) * 5.0) * glowAmount;

    skyColor = mix(skyColor, glowColor, horizonGlow);
    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

type SkyGradientProps = {
  time: WorldTime;
};
// 夜中の？
const NIGHT_LOWER = new THREE.Color('#00030a');
// 夜の最高点？
const NIGHT_ZENITH = new THREE.Color('#010512');
// 夜の地平線？
const NIGHT_HORIZON = new THREE.Color('#07111f');

// 夜明けの最高点？紺
const DAWN_ZENITH = new THREE.Color('#14203a');
// 夕暮れの最高点？紺
const DUSK_ZENITH = new THREE.Color('#1b1730');

// 夕暮れの地平線？オレンジ
const DUSK_HORIZON = new THREE.Color('#f0690a');
// 夜明けの地平線？薄いオレンジ？
const DAWN_HORIZON = new THREE.Color('#e18a72');

// 日中の…？灰みの青系
const DAY_LOWER = new THREE.Color('#86bfd6');
// 日中の最高点？明るい青紫
const DAY_ZENITH = new THREE.Color('#5fb2ff');
// 日中の地平線？淡い青
const DAY_HORIZON = new THREE.Color('#c5eaff');

const mixColor = (
  from: THREE.Color,
  to: THREE.Color,
  amount: number,
): THREE.Color =>
  from.clone().lerp(to, Math.max(0, Math.min(1, amount)));

const getSkyGradientColors = (time: WorldTime) => {
  const daylight = getDaylightAmount(time);
  const isEvening = time.hour >= 12;
  const twilightZenith = isEvening ? DUSK_ZENITH : DAWN_ZENITH;
  const twilightHorizon = isEvening ? DUSK_HORIZON : DAWN_HORIZON;
  const nightToTwilight = Math.min(1, daylight / 0.45);
  const twilightToDay = Math.max(0, Math.min(1, (daylight - 0.45) / 0.5));
  const zenith = daylight < 0.45
    ? mixColor(NIGHT_ZENITH, twilightZenith, nightToTwilight)
    : mixColor(twilightZenith, DAY_ZENITH, twilightToDay);
  const horizon = daylight < 0.45
    ? mixColor(NIGHT_HORIZON, twilightHorizon, nightToTwilight)
    : mixColor(twilightHorizon, DAY_HORIZON, twilightToDay);
  const lower = mixColor(NIGHT_LOWER, DAY_LOWER, Math.min(1, daylight / 0.9));

  return {
    zenith,
    horizon,
    lower,
    glow: twilightHorizon,
    glowAmount: Math.max(0, 1 - Math.abs(daylight - 0.38) / 0.42),
  };
};

export function SkyGradient({ time }: SkyGradientProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(
    () => new THREE.SphereGeometry(SKY_RADIUS, 48, 24),
    [],
  );
  const colors = getSkyGradientColors(time);

  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
    }

    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.zenithColor.value.copy(colors.zenith);
    materialRef.current.uniforms.horizonColor.value.copy(colors.horizon);
    materialRef.current.uniforms.lowerColor.value.copy(colors.lower);
    materialRef.current.uniforms.glowColor.value.copy(colors.glow);
    materialRef.current.uniforms.glowAmount.value = colors.glowAmount;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} frustumCulled={false} renderOrder={-20}>
        <shaderMaterial
          ref={materialRef}
          side={THREE.BackSide}
          vertexShader={SKY_GRADIENT_VERTEX_SHADER}
          fragmentShader={SKY_GRADIENT_FRAGMENT_SHADER}
          uniforms={{
            zenithColor: { value: colors.zenith },
            horizonColor: { value: colors.horizon },
            lowerColor: { value: colors.lower },
            glowColor: { value: colors.glow },
            glowAmount: { value: colors.glowAmount },
          }}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
