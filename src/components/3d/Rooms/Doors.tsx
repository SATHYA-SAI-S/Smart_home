import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';
import { DoorEntity } from '../../../types/world';

interface SingleDoorProps {
  door: DoorEntity;
}

const SingleDoor: React.FC<SingleDoorProps> = ({ door }) => {
  const toggleDoor = useWorldStore((state) => state.toggleDoor);
  const hingeRef = useRef<THREE.Group>(null);
  const targetAngle = door.isOpen ? -Math.PI / 2 : 0;

  useFrame((_, delta) => {
    if (hingeRef.current) {
      // Smooth animated hinge swing
      hingeRef.current.rotation.y = THREE.MathUtils.damp(
        hingeRef.current.rotation.y,
        targetAngle,
        10,
        delta
      );
    }
  });

  const doorWood = new THREE.MeshStandardMaterial({
    color: '#78350f', // Warm rich wood
    roughness: 0.4,
    metalness: 0.1,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    transmission: 0.7,
  });

  const isTerraceSliding = door.id === 'door_terrace';
  const isRollup = door.id === 'door_garage_exterior';

  return (
    <group position={door.position} rotation={[0, door.rotationY, 0]}>
      {/* Door frame jambs */}
      <mesh position={[-door.width / 2 - 0.04, 1.1, 0]}>
        <boxGeometry args={[0.08, 2.2, 0.18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[door.width / 2 + 0.04, 1.1, 0]}>
        <boxGeometry args={[0.08, 2.2, 0.18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <boxGeometry args={[door.width + 0.16, 0.08, 0.18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>

      {/* HINGED SWING DOOR OR SLIDING / ROLLUP */}
      <group
        ref={hingeRef}
        position={[-door.width / 2, 0, 0]} // Hinge pivot at left post
        onClick={(e) => {
          e.stopPropagation();
          toggleDoor(door.id);
        }}
      >
        {/* Door Leaf (offset so its left edge sits on the hinge pivot) */}
        <mesh
          position={[door.width / 2, 1.1, 0]}
          castShadow
          receiveShadow
          material={isTerraceSliding ? glassMat : doorWood}
        >
          <boxGeometry args={[door.width - 0.02, 2.14, 0.06]} />
        </mesh>

        {/* Door handle / lever */}
        <group position={[door.width - 0.12, 1.05, 0]}>
          <mesh castShadow position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* Electronic Smart Lock Keypad & Indicator LED */}
        <group position={[door.width - 0.12, 1.25, 0.04]}>
          {/* Keypad backing */}
          <mesh castShadow>
            <boxGeometry args={[0.07, 0.14, 0.03]} />
            <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Indicator Light (Green = Unlocked, Red = Locked) */}
          <mesh position={[0, 0.04, 0.018]}>
            <sphereGeometry args={[0.012, 16, 16]} />
            <meshStandardMaterial
              color={door.isLocked ? '#ef4444' : '#22c55e'}
              emissive={door.isLocked ? '#ef4444' : '#22c55e'}
              emissiveIntensity={2.5}
            />
          </mesh>
        </group>

        {/* Bathroom Inside Latch State */}
        {door.hasInsideLatch && (
          <group position={[door.width - 0.12, 0.95, -0.04]}>
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.02, 16]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Latch turn thumb knob */}
            <mesh
              position={[0, 0, -0.015]}
              rotation={[0, 0, door.isInsideLatched ? Math.PI / 2 : 0]}
            >
              <boxGeometry args={[0.03, 0.01, 0.01]} />
              <meshStandardMaterial
                color={door.isInsideLatched ? '#ef4444' : '#64748b'}
                emissive={door.isInsideLatched ? '#ef4444' : '#000000'}
                emissiveIntensity={door.isInsideLatched ? 1.5 : 0}
              />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

export const Doors: React.FC = () => {
  const doors = useWorldStore((state) => state.doors);

  return (
    <group name="interactive_doors">
      {doors.map((door) => (
        <SingleDoor key={door.id} door={door} />
      ))}
    </group>
  );
};
