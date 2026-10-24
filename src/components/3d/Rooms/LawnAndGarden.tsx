import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

export const LawnAndGarden: React.FC = () => {
  const devices = useWorldStore((state) => state.devices);
  const gateDevice = devices.find((d) => d.id === 'front_gate');
  const isGateOpen = gateDevice?.state.open;

  // Materials
  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 }),
    []
  );
  const foliageMat1 = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.7 }),
    []
  );
  const foliageMat2 = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.75 }),
    []
  );
  const stoneMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.6, metalness: 0.1 }),
    []
  );
  const fenceMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.3 }),
    []
  );

  return (
    <group name="lawn_and_garden">
      {/* Stone Paver Walkway from Front Gate (Z=19.5) to Front Door (Z=8.0) */}
      <group position={[1.0, 0.015, 0]}>
        {[18.5, 17.0, 15.5, 14.0, 12.5, 11.0, 9.5, 8.5].map((z, idx) => (
          <mesh key={`paver_${idx}`} position={[0, 0, z]} receiveShadow material={stoneMat}>
            <boxGeometry args={[1.4, 0.03, 1.1]} />
          </mesh>
        ))}
      </group>

      {/* Procedural Stylized Trees */}
      {[
        { x: -10.0, z: 18.0, scale: 1.2 },
        { x: 14.5, z: 18.2, scale: 1.1 },
        { x: 15.0, z: 10.5, scale: 0.9 },
        { x: -12.5, z: -5.0, scale: 1.0 },
        { x: 7.0, z: -6.5, scale: 1.1 },
      ].map((tree, i) => (
        <group key={`tree_${i}`} position={[tree.x, 0, tree.z]} scale={tree.scale}>
          {/* Trunk */}
          <mesh position={[0, 1.0, 0]} castShadow receiveShadow material={trunkMat}>
            <cylinderGeometry args={[0.2, 0.32, 2.0, 12]} />
          </mesh>
          {/* Foliage Canopy (Layered stylized tiers) */}
          <mesh position={[0, 2.2, 0]} castShadow receiveShadow material={foliageMat1}>
            <coneGeometry args={[1.4, 1.6, 12]} />
          </mesh>
          <mesh position={[0, 3.1, 0]} castShadow receiveShadow material={foliageMat2}>
            <coneGeometry args={[1.05, 1.4, 12]} />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow receiveShadow material={foliageMat1}>
            <coneGeometry args={[0.7, 1.1, 12]} />
          </mesh>
        </group>
      ))}

      {/* Low Shrubs & Flowerbeds */}
      {[
        { x: -2.5, z: 8.6 },
        { x: 4.5, z: 8.6 },
        { x: 11.0, z: 8.5 },
        { x: -6.0, z: 16.5 },
        { x: 8.0, z: 16.0 },
      ].map((shrub, idx) => (
        <mesh key={`shrub_${idx}`} position={[shrub.x, 0.3, shrub.z]} castShadow material={foliageMat2}>
          <dodecahedronGeometry args={[0.42, 1]} />
        </mesh>
      ))}

      {/* Perimeter Slatted Fence */}
      {/* South perimeter fence (X = [-14, 16], Z = 19.9) leaving 3m gap for front gate at X=[0, 2.4] */}
      {/* Left segment */}
      <mesh position={[-6.5, 0.6, 19.9]} castShadow material={fenceMat}>
        <boxGeometry args={[15.0, 1.2, 0.08]} />
      </mesh>
      {/* Right segment */}
      <mesh position={[9.2, 0.6, 19.9]} castShadow material={fenceMat}>
        <boxGeometry args={[13.6, 1.2, 0.08]} />
      </mesh>

      {/* Front Entrance Motorized Gate (Animates swing/slide) */}
      <group position={[1.0, 0.6, 19.9]}>
        {/* Gate Pillars */}
        <mesh position={[-1.3, 0.1, 0]} castShadow material={stoneMat}>
          <boxGeometry args={[0.3, 1.4, 0.3]} />
        </mesh>
        <mesh position={[1.3, 0.1, 0]} castShadow material={stoneMat}>
          <boxGeometry args={[0.3, 1.4, 0.3]} />
        </mesh>
        {/* Sliding / swinging gate leaf */}
        <mesh
          position={[isGateOpen ? 1.4 : 0, 0, 0]}
          castShadow
          material={fenceMat}
        >
          <boxGeometry args={[2.3, 1.1, 0.06]} />
        </mesh>
      </group>
    </group>
  );
};
