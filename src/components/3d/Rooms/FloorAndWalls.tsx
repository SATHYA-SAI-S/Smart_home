import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

// Material palettes for clean modern PBR look
const WALL_COLOR = '#f1f5f9'; // Slate 100
const WALL_OUTER_COLOR = '#e2e8f0'; // Slate 200
const BASEBOARD_COLOR = '#334155'; // Slate 700

export const FloorAndWalls: React.FC = () => {
  const rooms = useWorldStore((state) => state.rooms);
  const cameraMode = useWorldStore((state) => state.cameraMode);
  const roofCutaway = useWorldStore((state) => state.roofCutaway);

  // Auto cutaway roof and high walls in top or room view
  const isCutaway = roofCutaway || cameraMode === 'top' || cameraMode === 'room';

  // Floor materials
  const woodMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c29b74', roughness: 0.35, metalness: 0.05 }),
    []
  );
  const tileMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.15, metalness: 0.1 }),
    []
  );
  const concreteMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.7, metalness: 0.1 }),
    []
  );
  const deckMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.5, metalness: 0.05 }),
    []
  );
  const grassMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.85, metalness: 0.0 }),
    []
  );
  const wallMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.6, metalness: 0.05 }),
    []
  );
  const wallExteriorMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WALL_OUTER_COLOR, roughness: 0.7, metalness: 0.05 }),
    []
  );
  const glassMaterial = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.8,
      ior: 1.45,
    }),
    []
  );

  const wallHeight = isCutaway ? 1.6 : 2.8;

  return (
    <group name="house_structure">
      {/* ROOM FLOORS */}
      {rooms.map((room) => {
        const { min, max } = room.bounds;
        const width = max[0] - min[0];
        const depth = max[2] - min[2];
        const centerX = (min[0] + max[0]) / 2;
        const centerZ = (min[2] + max[2]) / 2;

        let mat = woodMaterial;
        if (room.floorTextureType === 'tile') mat = tileMaterial;
        if (room.floorTextureType === 'concrete') mat = concreteMaterial;
        if (room.floorTextureType === 'deck') mat = deckMaterial;
        if (room.floorTextureType === 'grass') mat = grassMaterial;

        return (
          <group key={`floor_${room.id}`}>
            {/* Main floor slab */}
            <mesh
              position={[centerX, -0.05, centerZ]}
              receiveShadow
              material={mat}
            >
              <boxGeometry args={[width, 0.1, depth]} />
            </mesh>

            {/* Subtle floor border frame */}
            <mesh position={[centerX, -0.01, centerZ]}>
              <boxGeometry args={[width + 0.04, 0.02, depth + 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* INTERIOR & EXTERIOR SOLID WALLS */}
      {/* North Exterior Wall (Bedroom & Bathroom) */}
      <mesh position={[-3.0, wallHeight / 2, -7.9]} castShadow receiveShadow material={wallExteriorMaterial}>
        <boxGeometry args={[18.0, wallHeight, 0.2]} />
      </mesh>

      {/* West Exterior Wall (Bathroom & Kitchen & Garage) */}
      <mesh position={[-11.9, wallHeight / 2, 4.0]} castShadow receiveShadow material={wallExteriorMaterial}>
        <boxGeometry args={[0.2, wallHeight, 24.0]} />
      </mesh>

      {/* East Exterior Wall of Main Hall & Bedroom */}
      <mesh position={[5.9, wallHeight / 2, -4.0]} castShadow receiveShadow material={wallExteriorMaterial}>
        <boxGeometry args={[0.2, wallHeight, 8.0]} />
      </mesh>

      {/* Dividing Wall: Bedroom vs Bathroom (X = -4.0, Z = [-8, 0]) */}
      <mesh position={[-4.0, wallHeight / 2, -4.0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[0.2, wallHeight, 7.8]} />
      </mesh>

      {/* Dividing Wall: Main Hall vs Bedroom (Z = 0.0, X = [-4, 6]) with doorway */}
      {/* Left segment */}
      <mesh position={[-1.75, wallHeight / 2, 0.0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[4.5, wallHeight, 0.2]} />
      </mesh>
      {/* Right segment */}
      <mesh position={[3.75, wallHeight / 2, 0.0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[4.5, wallHeight, 0.2]} />
      </mesh>
      {/* Lintel above bedroom door if full height */}
      {!isCutaway && (
        <mesh position={[1.0, 2.5, 0.0]} castShadow receiveShadow material={wallMaterial}>
          <boxGeometry args={[1.2, 0.6, 0.2]} />
        </mesh>
      )}

      {/* Dividing Wall: Kitchen vs Bathroom (Z = 0.0, X = [-12, -4]) with doorway */}
      <mesh position={[-10.25, wallHeight / 2, 0.0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[3.5, wallHeight, 0.2]} />
      </mesh>
      <mesh position={[-5.75, wallHeight / 2, 0.0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[3.5, wallHeight, 0.2]} />
      </mesh>

      {/* Dividing Wall: Main Hall vs Kitchen (X = -4.0, Z = [0, 8]) with doorway */}
      <mesh position={[-4.0, wallHeight / 2, 1.75]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[0.2, wallHeight, 3.5]} />
      </mesh>
      <mesh position={[-4.0, wallHeight / 2, 6.25]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[0.2, wallHeight, 3.5]} />
      </mesh>

      {/* Dividing Wall: Kitchen vs Garage (Z = 8.0, X = [-12, -4]) with doorway */}
      <mesh position={[-10.25, wallHeight / 2, 8.0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[3.5, wallHeight, 0.2]} />
      </mesh>
      <mesh position={[-5.75, wallHeight / 2, 8.0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[3.5, wallHeight, 0.2]} />
      </mesh>

      {/* South Exterior Wall: Main Hall (Z = 7.9) with main entrance door gap */}
      <mesh position={[-1.75, wallHeight / 2, 7.9]} castShadow receiveShadow material={wallExteriorMaterial}>
        <boxGeometry args={[4.5, wallHeight, 0.2]} />
      </mesh>
      <mesh position={[3.75, wallHeight / 2, 7.9]} castShadow receiveShadow material={wallExteriorMaterial}>
        <boxGeometry args={[4.5, wallHeight, 0.2]} />
      </mesh>

      {/* East Dividing Wall: Main Hall to Terrace (X = 5.9, Z = [0, 8]) with glass sliding doors */}
      <mesh position={[5.9, wallHeight / 2, 1.5]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[0.2, wallHeight, 3.0]} />
      </mesh>
      <mesh position={[5.9, wallHeight / 2, 6.5]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[0.2, wallHeight, 3.0]} />
      </mesh>

      {/* Terrace perimeter glass railings */}
      <mesh position={[13.9, 0.5, 4.0]} material={glassMaterial}>
        <boxGeometry args={[0.08, 1.0, 7.6]} />
      </mesh>
      <mesh position={[10.0, 0.5, 0.1]} material={glassMaterial}>
        <boxGeometry args={[7.8, 1.0, 0.08]} />
      </mesh>
      <mesh position={[10.0, 0.5, 7.9]} material={glassMaterial}>
        <boxGeometry args={[7.8, 1.0, 0.08]} />
      </mesh>

      {/* Full ceiling/roof when cutaway is off */}
      {!isCutaway && (
        <group position={[-3.0, 2.9, 0.0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[18.2, 0.2, 16.2]} />
            <meshStandardMaterial color="#475569" roughness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
};
