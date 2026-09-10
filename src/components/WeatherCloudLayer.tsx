import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Cloud } from '@react-three/drei';
import type { WeatherState } from '../types/Weather';

const CLOUD_PRESETS = {
  SUNNY: {
    clusters: 2,
    opacity: 0.25,
    scale: [8, 2, 4],
    height: 35,
  },
  CLOUDY: {
    clusters: 14,
    opacity: 0.45,
    scale: [14, 3, 7],
    height: 32,
  },
  RAIN: {
    clusters: 24,
    opacity: 0.68,
    scale: [18, 4, 9],
    height: 28,
  },
  FOG: {
    clusters: 6,
    opacity: 0.25,
    scale: [14, 2, 8],
    height: 24,
  },
};