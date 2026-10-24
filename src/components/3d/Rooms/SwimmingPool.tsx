import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

export const SwimmingPool: React.FC = () => {
  const devices = useWorldStore((state) => state.devices);
  const poolFilterDevice = devices.find((d) => d.id === 'pool_filter');
  const isFilterOn = poolFilterDevice?.state.power === 'on';

  // Refs for continuous water ripple and jet animation
  const waterMeshRef = useRef<THREE.Mesh>(null);
  const jetGroupRef = useRef<THREE.Group>(null);
  const pumpFanRef = useRef<THREE.Mesh>(null);

  // Materials
  const copingMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4, metalness: 0.1 }),
    []
  );
  const deckSurroundMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.6, metalness: 0.05 }),
    []
  );
  const basinTileMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.2, metalness: 0.15 }),
    []
  );
  const metalChromeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 }),
    []
  );
  const waterMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.78,
        roughness: 0.08,
        metalness: 0.1,
        transmission: 0.72,
        ior: 1.333,
        reflectivity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  // Animate water surface ripples and filtration jets
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    if (waterMeshRef.current) {
      // Gentle surface wave motion; accelerates and amplifies when filter pump is running
      const waveSpeed = isFilterOn ? 3.5 : 1.2;
      const waveAmplitude = isFilterOn ? 0.025 : 0.01;
      waterMeshRef.current.position.y = -0.06 + Math.sin(time * waveSpeed) * waveAmplitude;
      waterMeshRef.current.rotation.z = Math.sin(time * 0.5 * waveSpeed) * 0.003;
    }

    if (jetGroupRef.current && isFilterOn) {
      // Pulsing water circulation jet bubbles
      const s = 1.0 + Math.sin(time * 8.0) * 0.15;
      jetGroupRef.current.scale.set(s, 1.0, s);
    }

    if (pumpFanRef.current && isFilterOn) {
      pumpFanRef.current.rotation.z += delta * 15.0;
    }
  });

  // Pool Dimensions & Placement: directly in front (South) of 1st floor terrace
  const poolCenter: [number, number, number] = [11.1, 0, 13.6];
  const poolWidth = 4.8;
  const poolLength = 5.4;
  const poolDepth = 1.4;

  return (
    <group name="swimming_pool" position={poolCenter}>
      {/* ========================================================= */}
      {/* 1. SURROUNDING STONE PATIO / SUN DECK                     */}
      {/* ========================================================= */}
      <mesh position={[0, -0.01, 0]} receiveShadow material={deckSurroundMaterial}>
        <boxGeometry args={[poolWidth + 2.2, 0.08, poolLength + 2.2]} />
      </mesh>

      {/* Travertine Coping Border Rim */}
      {/* North coping rim */}
      <mesh position={[0, 0.06, -(poolLength / 2 + 0.2)]} castShadow receiveShadow material={copingMaterial}>
        <boxGeometry args={[poolWidth + 0.8, 0.12, 0.4]} />
      </mesh>
      {/* South coping rim */}
      <mesh position={[0, 0.06, poolLength / 2 + 0.2]} castShadow receiveShadow material={copingMaterial}>
        <boxGeometry args={[poolWidth + 0.8, 0.12, 0.4]} />
      </mesh>
      {/* West coping rim */}
      <mesh position={[-(poolWidth / 2 + 0.2), 0.06, 0]} castShadow receiveShadow material={copingMaterial}>
        <boxGeometry args={[0.4, 0.12, poolLength]} />
      </mesh>
      {/* East coping rim */}
      <mesh position={[poolWidth / 2 + 0.2, 0.06, 0]} castShadow receiveShadow material={copingMaterial}>
        <boxGeometry args={[0.4, 0.12, poolLength]} />
      </mesh>

      {/* ========================================================= */}
      {/* 2. SUNKEN POOL BASIN WALLS & FLOOR (Ceramic Blue Tiles)   */}
      {/* ========================================================= */}
      {/* Basin Floor */}
      <mesh position={[0, -poolDepth, 0]} receiveShadow material={basinTileMaterial}>
        <boxGeometry args={[poolWidth, 0.1, poolLength]} />
      </mesh>
      {/* Floor Lane Marker Strip */}
      <mesh position={[0, -poolDepth + 0.06, 0]}>
        <boxGeometry args={[0.3, 0.02, poolLength - 1.0]} />
        <meshStandardMaterial color="#0369a1" roughness={0.3} />
      </mesh>

      {/* North Interior Wall */}
      <mesh position={[0, -poolDepth / 2, -poolLength / 2]} receiveShadow material={basinTileMaterial}>
        <boxGeometry args={[poolWidth, poolDepth, 0.1]} />
      </mesh>
      {/* South Interior Wall */}
      <mesh position={[0, -poolDepth / 2, poolLength / 2]} receiveShadow material={basinTileMaterial}>
        <boxGeometry args={[poolWidth, poolDepth, 0.1]} />
      </mesh>
      {/* West Interior Wall */}
      <mesh position={[-poolWidth / 2, -poolDepth / 2, 0]} receiveShadow material={basinTileMaterial}>
        <boxGeometry args={[0.1, poolDepth, poolLength]} />
      </mesh>
      {/* East Interior Wall */}
      <mesh position={[poolWidth / 2, -poolDepth / 2, 0]} receiveShadow material={basinTileMaterial}>
        <boxGeometry args={[0.1, poolDepth, poolLength]} />
      </mesh>

      {/* Shallow End Entry Steps (North Side) */}
      {[0, 1, 2].map((stepIdx) => {
        const stepY = -0.35 - stepIdx * 0.35;
        const stepZ = -(poolLength / 2 - 0.45 - stepIdx * 0.4);
        return (
          <mesh key={`pool_step_${stepIdx}`} position={[0, stepY, stepZ]} receiveShadow material={basinTileMaterial}>
            <boxGeometry args={[poolWidth - 0.2, 0.35, 0.45]} />
          </mesh>
        );
      })}

      {/* ========================================================= */}
      {/* 3. ANIMATED WATER SURFACE                                 */}
      {/* ========================================================= */}
      <mesh
        ref={waterMeshRef}
        position={[0, -0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        material={waterMaterial}
      >
        <planeGeometry args={[poolWidth - 0.05, poolLength - 0.05, 32, 32]} />
      </mesh>

      {/* Underwater Glow Illumination Spotlights */}
      <pointLight
        position={[0, -0.6, 0]}
        color="#06b6d4"
        intensity={isFilterOn ? 2.5 : 1.2}
        distance={7.0}
        decay={2}
      />
      <pointLight
        position={[0, -0.6, 1.5]}
        color="#38bdf8"
        intensity={isFilterOn ? 2.0 : 0.8}
        distance={6.0}
        decay={2}
      />

      {/* ========================================================= */}
      {/* 4. ACTIVE WATER FILTRATION JETS & BUBBLES                */}
      {/* ========================================================= */}
      {isFilterOn && (
        <group ref={jetGroupRef}>
          {/* East Jet Return 1 */}
          <group position={[poolWidth / 2 - 0.2, -0.15, -0.8]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.35, 0.05, 1.2, 16]} />
              <meshBasicMaterial color="#e0f2fe" transparent opacity={0.65} />
            </mesh>
            <mesh position={[-0.8, 0.06, 0]}>
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
          </group>

          {/* East Jet Return 2 */}
          <group position={[poolWidth / 2 - 0.2, -0.15, 1.2]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.35, 0.05, 1.2, 16]} />
              <meshBasicMaterial color="#e0f2fe" transparent opacity={0.65} />
            </mesh>
            <mesh position={[-0.8, 0.06, 0]}>
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
          </group>
        </group>
      )}

      {/* ========================================================= */}
      {/* 5. STAINLESS STEEL LADDER                                 */}
      {/* ========================================================= */}
      <group position={[-(poolWidth / 2 - 0.15), 0, 1.2]}>
        {/* Left Vertical Handrail Pipe */}
        <mesh position={[0, 0.25, -0.25]} material={metalChromeMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 1.4, 12]} />
        </mesh>
        {/* Right Vertical Handrail Pipe */}
        <mesh position={[0, 0.25, 0.25]} material={metalChromeMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 1.4, 12]} />
        </mesh>
        {/* Curved Handles extending onto coping */}
        <mesh position={[-0.15, 0.95, -0.25]} rotation={[0, 0, Math.PI / 2]} material={metalChromeMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 0.35, 12]} />
        </mesh>
        <mesh position={[-0.15, 0.95, 0.25]} rotation={[0, 0, Math.PI / 2]} material={metalChromeMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 0.35, 12]} />
        </mesh>
        {/* Horizontal Ladder Steps */}
        {[-0.1, -0.4, -0.7].map((ry, ri) => (
          <mesh key={`rung_${ri}`} position={[0, ry, 0]} material={metalChromeMaterial}>
            <boxGeometry args={[0.06, 0.025, 0.48]} />
          </mesh>
        ))}
      </group>

      {/* ========================================================= */}
      {/* 6. POOL FILTERING PROCESS SWITCH & PUMP ENCLOSURE         */}
      {/* ========================================================= */}
      <group position={[poolWidth / 2 + 0.75, 0.3, 0]}>
        {/* Pump Housing Box */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.55, 0.75]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Pump Ventilation Grill */}
        <mesh ref={pumpFanRef} position={[0.28, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.18, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>

        {/* Status Indicator LED Beacon */}
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={isFilterOn ? '#10b981' : '#f59e0b'} />
        </mesh>
        {isFilterOn && (
          <pointLight position={[0, 0.35, 0]} color="#10b981" intensity={0.9} distance={1.8} />
        )}

        {/* PVC Filtration Pipes connecting into pool coping */}
        <mesh position={[-0.42, -0.05, -0.15]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 12]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
        </mesh>
        <mesh position={[-0.42, -0.05, 0.15]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 12]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};
