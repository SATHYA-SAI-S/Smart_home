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

interface ClownBodyProps {
  person: PersonEntity;
  leftArmRef: React.RefObject<THREE.Group>;
  rightArmRef: React.RefObject<THREE.Group>;
  leftLegRef: React.RefObject<THREE.Group>;
  rightLegRef: React.RefObject<THREE.Group>;
}

const ClownBody: React.FC<ClownBodyProps> = ({
  leftArmRef,
  rightArmRef,
  leftLegRef,
  rightLegRef,
}) => {
  const balloonRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (balloonRef.current) {
      balloonRef.current.position.y = 1.15 + Math.sin(state.clock.elapsedTime * 1.6) * 0.035;
      balloonRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.2) * 0.05;
    }
  });

  return (
    <group scale={1.0}>
      {/* 1. CLOWN HEAD & MAKEUP */}
      <group position={[0, 1.45, 0]}>
        {/* Porcelain white face paint */}
        <mesh castShadow>
          <sphereGeometry args={[0.19, 24, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>

        {/* Big Puffy Wild Clown Afro Hair (Sides & Back) */}
        <mesh position={[-0.18, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#f97316" roughness={0.9} />
        </mesh>
        <mesh position={[0.18, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#f97316" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.09, -0.12]} castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#ea580c" roughness={0.9} />
        </mesh>

        {/* Tall Festive Clown Party Cone Hat */}
        <group position={[0, 0.22, 0]} rotation={[-0.08, 0, 0.05]}>
          <mesh castShadow>
            <coneGeometry args={[0.12, 0.36, 16]} />
            <meshStandardMaterial color="#c026d3" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <torusGeometry args={[0.095, 0.018, 12, 20]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.19, 0]} castShadow>
            <sphereGeometry args={[0.045, 14, 14]} />
            <meshStandardMaterial color="#eab308" roughness={0.8} />
          </mesh>
        </group>

        {/* Iconic Glossy Red Clown Nose */}
        <mesh position={[0, 0.01, 0.19]} castShadow>
          <sphereGeometry args={[0.055, 18, 18]} />
          <meshStandardMaterial color="#dc2626" roughness={0.15} metalness={0.1} />
        </mesh>

        {/* Painted Smiling Red Mouth */}
        <mesh position={[0, -0.08, 0.17]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.065, 0.018, 12, 16, Math.PI]} />
          <meshBasicMaterial color="#e11d48" />
        </mesh>

        {/* Painted Rosy Pink Cheeks */}
        <mesh position={[-0.12, -0.02, 0.14]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>
        <mesh position={[0.12, -0.02, 0.14]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>

        {/* Diamond Blue Eye Makeup */}
        <mesh position={[-0.07, 0.05, 0.17]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.024, 0.024, 0.006, 4]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
        <mesh position={[0.07, 0.05, 0.17]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.024, 0.024, 0.006, 4]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>

        {/* Eyes / Pupils */}
        <mesh position={[-0.07, 0.045, 0.175]}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.07, 0.045, 0.175]}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* 2. ACCORDION RUFFLED NECK COLLAR */}
      <group position={[0, 1.28, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.22, 0.075, 14, 24]} />
          <meshStandardMaterial color="#fde047" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <torusGeometry args={[0.18, 0.045, 12, 20]} />
          <meshStandardMaterial color="#f43f5e" roughness={0.6} />
        </mesh>
      </group>

      {/* 3. BAGGY HARLEQUIN JUMPSUIT */}
      <group position={[0, 0.95, 0]}>
        <mesh position={[-0.09, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.14, 0.13, 0.62, 16]} />
          <meshStandardMaterial color="#06b6d4" roughness={0.5} />
        </mesh>
        <mesh position={[0.09, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.14, 0.13, 0.62, 16]} />
          <meshStandardMaterial color="#ec4899" roughness={0.5} />
        </mesh>

        {/* Pompom Buttons down chest */}
        <mesh position={[0, 0.18, 0.16]} castShadow>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.02, 0.16]} castShadow>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color="#ef4444" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.14, 0.16]} castShadow>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color="#84cc16" roughness={0.7} />
        </mesh>
      </group>

      {/* 4. ARMS & WHITE GLOVES */}
      <group ref={leftArmRef} position={[-0.28, 1.15, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.32, 12, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow>
          <sphereGeometry args={[0.09, 14, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[0.28, 1.15, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.32, 12, 12]} />
          <meshStandardMaterial color="#06b6d4" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow>
          <sphereGeometry args={[0.09, 14, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* 5. FLOATING FESTIVE HELIUM BALLOON */}
      <group position={[0.28, 0.73, 0]}>
        <mesh position={[0.06, 0.65, 0.05]}>
          <cylinderGeometry args={[0.003, 0.003, 0.9, 6]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>
        <group ref={balloonRef} position={[0.06, 1.15, 0.05]}>
          <mesh castShadow scale={[1, 1.25, 1]}>
            <sphereGeometry args={[0.18, 20, 20]} />
            <meshStandardMaterial color="#ef4444" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh position={[0, -0.19, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.035, 0.05, 8]} />
            <meshStandardMaterial color="#dc2626" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* 6. BAGGY LEGS & OVERSIZED BULBOUS CLOWN SHOES */}
      <group ref={leftLegRef} position={[-0.12, 0.65, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.45, 12, 12]} />
          <meshStandardMaterial color="#ec4899" roughness={0.5} />
        </mesh>
        <group position={[0, -0.56, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.12, 0.36]} />
            <meshStandardMaterial color="#dc2626" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.02, 0.16]} castShadow>
            <sphereGeometry args={[0.1, 14, 14]} />
            <meshStandardMaterial color="#facc15" roughness={0.5} />
          </mesh>
        </group>
      </group>

      <group ref={rightLegRef} position={[0.12, 0.65, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.45, 12, 12]} />
          <meshStandardMaterial color="#06b6d4" roughness={0.5} />
        </mesh>
        <group position={[0, -0.56, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.12, 0.36]} />
            <meshStandardMaterial color="#dc2626" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.02, 0.16]} castShadow>
            <sphereGeometry args={[0.1, 14, 14]} />
            <meshStandardMaterial color="#facc15" roughness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

const DogBody: React.FC<{ person: PersonEntity }> = ({ person }) => {
  const tailRef = useRef<THREE.Group>(null);
  const legFL = useRef<THREE.Group>(null);
  const legFR = useRef<THREE.Group>(null);
  const legBL = useRef<THREE.Group>(null);
  const legBR = useRef<THREE.Group>(null);

  useFrame((state) => {
    // 1. Enthusiastic wagging tail
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 14.0) * 0.45;
    }

    // 2. 4-Leg trotting animation when moving
    const isMoving = person.activity === 'walking';
    const trot = isMoving ? Math.sin(state.clock.elapsedTime * 9.0) * 0.5 : 0;
    if (legFL.current) legFL.current.rotation.x = trot;
    if (legBR.current) legBR.current.rotation.x = trot;
    if (legFR.current) legFR.current.rotation.x = -trot;
    if (legBL.current) legBL.current.rotation.x = -trot;
  });

  return (
    <group scale={1.0}>
      {/* Torso / Body */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.28, 0.6]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>

      {/* Dog Head & Snout */}
      <group position={[0, 0.52, 0.28]}>
        {/* Head */}
        <mesh castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.04, 0.12]} castShadow>
          <boxGeometry args={[0.11, 0.08, 0.14]} />
          <meshStandardMaterial color="#b45309" roughness={0.6} />
        </mesh>
        {/* Shiny Black Nose */}
        <mesh position={[0, -0.01, 0.2]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.055, 0.04, 0.12]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.055, 0.04, 0.12]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        {/* Floppy Golden Ears */}
        <mesh position={[-0.14, 0.02, -0.02]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.04, 0.18, 0.09]} />
          <meshStandardMaterial color="#92400e" roughness={0.8} />
        </mesh>
        <mesh position={[0.14, 0.02, -0.02]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.04, 0.18, 0.09]} />
          <meshStandardMaterial color="#92400e" roughness={0.8} />
        </mesh>
      </group>

      {/* Red Collar & Golden Tag */}
      <group position={[0, 0.44, 0.2]}>
        <mesh>
          <torusGeometry args={[0.13, 0.02, 12, 20]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.11, 0.05]}>
          <cylinderGeometry args={[0.022, 0.022, 0.005, 12]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 4 Trotting Legs */}
      {/* Front Left */}
      <group ref={legFL} position={[-0.11, 0.24, 0.2]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.2, 8, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
      </group>
      {/* Front Right */}
      <group ref={legFR} position={[0.11, 0.24, 0.2]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.2, 8, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
      </group>
      {/* Back Left */}
      <group ref={legBL} position={[-0.11, 0.24, -0.2]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.2, 8, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
      </group>
      {/* Back Right */}
      <group ref={legBR} position={[0.11, 0.24, -0.2]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.2, 8, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
      </group>

      {/* Wagging Tail */}
      <group ref={tailRef} position={[0, 0.44, -0.3]}>
        <mesh position={[0, 0.12, -0.06]} rotation={[0.45, 0, 0]} castShadow>
          <capsuleGeometry args={[0.035, 0.22, 8, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};

export const Avatar: React.FC<AvatarProps> = ({ person, isCurrentController }) => {
  const cameraMode = useWorldStore((state) => state.cameraMode);
  const setSelectedPersonId = useWorldStore((state) => state.setSelectedPersonId);

  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const isClown = person.id === 'person_sudharshini' || person.name.toLowerCase().includes('sudharshini');
  const isDog = person.id === 'person_dog' || person.attributes.role === 'pet' || person.name.toLowerCase().includes('buddy');

  // In 3rd person view, keep character mesh visible at all times
  const isFirstPersonControlled = false;

  // Scale based on age group
  let scale = 1.0;
  let bodyHeight = isClown ? 1.75 : isDog ? 0.75 : 1.65;
  if (person.attributes.ageGroup === 'elderly') {
    scale = 0.95;
    bodyHeight = 1.55;
  } else if (person.attributes.ageGroup === 'child' && !isDog) {
    scale = 0.65;
    bodyHeight = 1.05;
  }

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth position & rotation sync
    groupRef.current.position.set(person.position[0], person.position[1], person.position[2]);
    groupRef.current.rotation.y = person.rotationY;

    // Limb swing walk animation (clown stands completely still, dog has its own 4-leg trot)
    const isMoving = !isClown && !isDog && person.activity === 'walking';
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

      {/* BILLBOARD NAME & ACTIVITY TAG (Hidden for active player in 3rd person so it doesn't block camera) */}
      {!(isCurrentController && cameraMode === 'person') && (
        <group position={[0, bodyHeight + 0.35, 0]}>
          <Billboard follow={true}>
            <Text
              fontSize={0.24}
              color={isClown ? '#f43f5e' : isDog ? '#f59e0b' : isCurrentController ? '#38bdf8' : '#ffffff'}
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
              color={isClown ? '#fbbf24' : isDog ? '#38bdf8' : '#94a3b8'}
              anchorX="center"
              anchorY="top"
              outlineWidth={0.015}
              outlineColor="#020617"
            >
              {isClown ? '[Clown · Standing Still]' : isDog ? '[Dog · Roaming]' : `[${person.activity}]`}
            </Text>
          </Billboard>
        </group>
      )}

      {/* 3D CHARACTER MESH */}
      {!isFirstPersonControlled && (
        isClown ? (
          <ClownBody
            person={person}
            leftArmRef={leftArmRef}
            rightArmRef={rightArmRef}
            leftLegRef={leftLegRef}
            rightLegRef={rightLegRef}
          />
        ) : isDog ? (
          <DogBody person={person} />
        ) : (
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
        )
      )}
    </group>
  );
};
