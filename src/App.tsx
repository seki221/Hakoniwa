// import { useState } from 'react'

import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
export default function World() {
  const camera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 1;
  return (
    <div style={{ height: '500px' }}>
      <Canvas>
        {/* ここが「世界」になります */}
        <ambientLight />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="orange" />


        </mesh>
      </Canvas>
    </div>
  )
}