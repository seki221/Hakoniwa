import * as THREE from "three"
import { useTexture } from "@react-three/drei"
import { CuboidCollider, RigidBody} from "@react-three/rapier"
import grass from "./assets/grass.png"

export const FIELD_SIZE = 200;
const FIELD_COLLIDER_HALF_SIZE = FIELD_SIZE / 2;


export function Field(){
  const texture = useTexture(grass)

  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh receiveShadow position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[FIELD_SIZE, FIELD_SIZE]} />
        <meshStandardMaterial
          map={texture}
          map-colorSpace={THREE.SRGBColorSpace}
          map-repeat={[24, 24]}
          map-wrapS={THREE.RepeatWrapping}
          map-wrapT={THREE.RepeatWrapping}
          color="green"
        />
      </mesh>
      <CuboidCollider args={[FIELD_COLLIDER_HALF_SIZE, 5, FIELD_COLLIDER_HALF_SIZE]} position={[0, -2, 0]} />
    </RigidBody>
  )
}
