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
  uniform vec3 baseTopColor;
  uniform vec3 baseHorizonColor;
  uniform vec3 baseBottomColor;
  uniform vec3 dayTopColor;
  uniform vec3 dayHorizonColor;
  uniform vec3 dayBottomColor;
  uniform vec3 glowColor;
  uniform float glowAmount;
  uniform float dayLayerAmount;
  varying vec3 vDirection;

  vec3 getSkyColor(vec3 topColor, vec3 horizonColor, vec3 bottomColor, float height) {
    float horizonBlend = smoothstep(0.08, 0.62, height);
    float bottomBlend = smoothstep(0.0, 0.3, height);
    vec3 bottomToHorizon = mix(bottomColor, horizonColor, bottomBlend);

    return mix(bottomToHorizon, topColor, horizonBlend);
  }

  void main() {
    float height = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 baseSkyColor = getSkyColor(
      baseTopColor,
      baseHorizonColor,
      baseBottomColor,
      height
    );
    vec3 daySkyColor = getSkyColor(
      dayTopColor,
      dayHorizonColor,
      dayBottomColor,
      height
    );
    float dayLayerEdge = 1.2 - dayLayerAmount * 1.4;
    float verticalDayLayer = smoothstep(dayLayerEdge - 0.18, dayLayerEdge + 0.18, height);
    vec3 skyColor = mix(baseSkyColor, daySkyColor, verticalDayLayer);
    float horizonGlow = exp(-abs(vDirection.y) * 5.0) * glowAmount;

    skyColor = mix(skyColor, glowColor, horizonGlow);
    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

type SkyGradientProps = {
  time: WorldTime;
};

type SkyPalette = {
  /** 画面上側・頭上側の空色。 */
  top: THREE.Color;
  /** 地平線に近い帯の色。朝焼け/夕焼けは主にここに出す。 */
  horizon: THREE.Color;
  /** 画面下側の空色。カメラ角度が低い時の黒浮きを抑えるために使う。 */
  bottom: THREE.Color;
};

const NIGHT_SKY: SkyPalette = {
  top: new THREE.Color('#010512'),
  horizon: new THREE.Color('#07111f'),
  bottom: new THREE.Color('#00030a'),
};

const DAWN_SKY: SkyPalette = {
  top: new THREE.Color('#14203a'),
  horizon: new THREE.Color('#e18a72'),
  bottom: NIGHT_SKY.horizon,
};

const DUSK_SKY: SkyPalette = {
  top: new THREE.Color('#1b1730'),
  horizon: new THREE.Color('#f0690a'),
  bottom: NIGHT_SKY.horizon,
};

const DAY_SKY: SkyPalette = {
  top: new THREE.Color('#5fb2ff'),
  horizon: new THREE.Color('#c5eaff'),
  bottom: new THREE.Color('#86bfd6'),
};

const mixColor = (
  from: THREE.Color,
  to: THREE.Color,
  amount: number,
): THREE.Color =>
  from.clone().lerp(to, Math.max(0, Math.min(1, amount)));

const mixPalette = (
  from: SkyPalette,
  to: SkyPalette,
  amount: number,
): SkyPalette => ({
  top: mixColor(from.top, to.top, amount),
  horizon: mixColor(from.horizon, to.horizon, amount),
  bottom: mixColor(from.bottom, to.bottom, amount),
});

const getSkyGradientColors = (time: WorldTime) => {
  const daylight = getDaylightAmount(time);
  const isEvening = time.hour >= 12;
  const twilightSky = isEvening ? DUSK_SKY : DAWN_SKY;
  const nightToTwilight = Math.min(1, daylight / 0.45);
  const dayLayerAmount = Math.max(0, Math.min(1, (daylight - 0.45) / 0.5));
  const baseSky = daylight < 0.45
    ? mixPalette(NIGHT_SKY, twilightSky, nightToTwilight)
    : twilightSky;

  return {
    baseSky,
    daySky: DAY_SKY,
    glow: twilightSky.horizon,
    glowAmount: Math.max(0, 1 - Math.abs(daylight - 0.38) / 0.42),
    dayLayerAmount,
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

    materialRef.current.uniforms.baseTopColor.value.copy(colors.baseSky.top);
    materialRef.current.uniforms.baseHorizonColor.value.copy(colors.baseSky.horizon);
    materialRef.current.uniforms.baseBottomColor.value.copy(colors.baseSky.bottom);
    materialRef.current.uniforms.dayTopColor.value.copy(colors.daySky.top);
    materialRef.current.uniforms.dayHorizonColor.value.copy(colors.daySky.horizon);
    materialRef.current.uniforms.dayBottomColor.value.copy(colors.daySky.bottom);
    materialRef.current.uniforms.glowColor.value.copy(colors.glow);
    materialRef.current.uniforms.glowAmount.value = colors.glowAmount;
    materialRef.current.uniforms.dayLayerAmount.value = colors.dayLayerAmount;
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
            baseTopColor: { value: colors.baseSky.top },
            baseHorizonColor: { value: colors.baseSky.horizon },
            baseBottomColor: { value: colors.baseSky.bottom },
            dayTopColor: { value: colors.daySky.top },
            dayHorizonColor: { value: colors.daySky.horizon },
            dayBottomColor: { value: colors.daySky.bottom },
            glowColor: { value: colors.glow },
            glowAmount: { value: colors.glowAmount },
            dayLayerAmount: { value: colors.dayLayerAmount },
          }}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
