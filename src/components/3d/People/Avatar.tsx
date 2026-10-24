import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PersonEntity } from '../../../types/world';
import { useWorldStore } from '../../../store/useWorldStore';

interface AvatarProps {
  person: PersonEntity;
  isCurrentController: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ person, isCurrentController }) => {
  const cameraMode = useWorldStore((state) => state.cameraMode);
  const setSelectedPersonId = useWorldStore((state) => state.setSelectedPersonId);

  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  // In first person view, hide the controlled person's head & torso so it doesn't clip camera
  const isFirstPersonControlled = isCurrentController && cameraMode === 'person';

  // Scale based on age group
  let scale = 1.0;
  let bodyHeight = 1.65;
  if (person.attributes.ageGroup === 'elderly') {
    scale = 0.95;
    bodyHeight = 1.55;
  } else if (person.attributes.ageGroup === 'child') {
    scale = 0.65;
    bodyHeight = 1.05;
  }

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth position & rotation sync
    groupRef.current.position.set(person.position[0], person.position[1], person.position[2]);
    groupRef.current.rotation.y = person.rotationY;

    // Limb swing walk animation
    const isMoving = person.activity === 'walking';
    const walkSpeed = person.attributes.mobility === 'reduced' ? 5.0 : 9.0;
    const walkSwing = isMoving ? Math.sin(state.clock.elapsedTime * walkSpeed) * 0.55 : 0;

    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = walkSwing;
      rightLegRef.current.rotation.x = -walkSwing;
    }
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = -walkSwing * 0.8;
      rightArmRef.current.rotation.x = walkSwing * 0.8;
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedPersonId(person.id);
      }}
    >
      {/* SELECTION AURA / RING AT FEET */}
      {isCurrentController && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38 * scale, 0.44 * scale, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
        </mesh>
      )}

      {/* BILLBOARD NAME & ACTIVITY TAG */}
      {!isFirstPersonControlled && (
        <group position={[0, bodyHeight + 0.35, 0]}>
          <Billboard follow={true}>
            <Text
              fontSize={0.24}
              color={isCurrentController ? '#38bdf8' : '#ffffff'}
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.02}
              outlineColor="#020617"
            >
              {`${person.name}${isCurrentController ? ' (Controlled)' : ''}`}
            </Text>
            <Text
              position={[0, -0.15, 0]}
              fontSize={0.16}
              color="#94a3b8"
              anchorX="center"
              anchorY="top"
              outlineWidth={0.015}
              outlineColor="#020617"
            >
              {`[${person.activity}]`}
            </Text>
          </Billboard>
        </group>
      )}

      {/* 3D HUMANOID MESH (Hidden in first-person view for the active avatar) */}
      {!isFirstPersonControlled && (
        <group scale={scale}>
          {/* Head */}
          <group position={[0, 1.45, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.18, 24, 24]} />
              <meshStandardMaterial color="#fed7aa" roughness={0.4} />
            </mesh>
            {/* Hair / Headwear */}
            <mesh position={[0, 0.08, -0.02]} castShadow>
              <sphereGeometry args={[0.19, 16, 16]} />
              <meshStandardMaterial
                color={
                  person.attributes.ageGroup === 'elderly'
                    ? '#e2e8f0' // Silver/white for grandpa
                    : person.attributes.ageGroup === 'child'
                    ? '#b45309' // Brown
                    : '#1e293b' // Dark
                }
                roughness={0.8}
              />
            </mesh>
            {/* Eyes */}
            <mesh position={[0.07, 0.02, 0.16]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
            <mesh position={[-0.07, 0.02, 0.16]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          </group>

          {/* Torso / Clothes with customized Person Color */}
          <group position={[0, 0.95, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.22, 0.19, 0.62, 20]} />
              <meshStandardMaterial color={person.color} roughness={0.5} />
            </mesh>
          </group>

          {/* Left Arm */}
          <group ref={leftArmRef} position={[-0.28, 1.15, 0]}>
            <mesh position={[0, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.32, 12, 12]} />
              <meshStandardMaterial color={person.color} roughness={0.5} />
            </mesh>
          </group>

          {/* Right Arm */}
          <group ref={rightArmRef} position={[0.28, 1.15, 0]}>
            <mesh position={[0, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.32, 12, 12]} />
              <meshStandardMaterial color={person.color} roughness={0.5} />
            </mesh>
          </group>

          {/* Left Leg */}
          <group ref={leftLegRef} position={[-0.11, 0.65, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.45, 12, 12]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
            {/* Shoe */}
            <mesh position={[0, -0.58, 0.04]} castShadow>
              <boxGeometry args={[0.13, 0.1, 0.22]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
          </group>

          {/* Right Leg */}
          <group ref={rightLegRef} position={[0.11, 0.65, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.45, 12, 12]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
            {/* Shoe */}
            <mesh position={[0, -0.58, 0.04]} castShadow>
              <boxGeometry args={[0.13, 0.1, 0.22]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};
