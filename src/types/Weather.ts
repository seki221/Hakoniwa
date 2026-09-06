// import * as THREE from 'three';
export type Weatherconditions = 'SUNNY' | 'CLOUDY' | 'RAIN' | 'FOG';
export type windBehaviorState = 'null' | 'breeze' | 'gale' | 'storm';
export type WeatherState = {
  id: string;
  wind: windBehaviorState;
  // position: THREE.Vector3;
  state: Weatherconditions;
};

