import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

export const Furniture: React.FC = () => {
  const devices = useWorldStore((state) => state.devices);
  const tvDevice = devices.find((d) => d.id === 'hall_tv');
  const stoveDevice = devices.find((d) => d.id === 'kitchen_stove');
  const fridgeDevice = devices.find((d) => d.id === 'kitchen_fridge');

  const isTvOn = tvDevice?.state.power === 'on';
  const isStoveOn = stoveDevice?.state.power === 'on';

  // Materials
  const sofaFabric = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 }),
    []
  );
  const woodFurniture = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.4, metalness: 0.05 }),
    []
  );
  const marbleTop = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.1 }),
    []
  );
  const darkMetal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.8 }),
    []
  );
  const chrome = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.1, metalness: 0.95 }),
    []
  );
  const stainlessSteel = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.3, metalness: 0.7 }),
    []
  );
  const porcelain = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0.05 }),
    []
  );
  const carBodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.15, metalness: 0.85 }),
    []
  );
  const rubberMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.9 }),
    []
  );

  return (
    <group name="house_furniture">
      {/* ========================================================= */}
      {/* MAIN HALL FURNITURE                                       */}
      {/* ========================================================= */}
      <group position={[1.0, 0, 4.0]}>
        {/* Soft living room area rug */}
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[4.8, 4.0]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>

        {/* Modern L-shaped Sectional Couch */}
        <group position={[0, 0, 1.2]}>
          {/* Main seating base */}
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow material={sofaFabric}>
            <boxGeometry args={[3.2, 0.3, 1.0]} />
          </mesh>
          {/* Main backrest */}
          <mesh position={[0, 0.65, 0.4]} castShadow receiveShadow material={sofaFabric}>
            <boxGeometry args={[3.2, 0.5, 0.25]} />
          </mesh>
          {/* L-extension chaise on right */}
          <mesh position={[1.2, 0.25, -0.6]} castShadow receiveShadow material={sofaFabric}>
            <boxGeometry args={[0.8, 0.3, 1.2]} />
          </mesh>
          {/* Left armrest */}
          <mesh position={[-1.5, 0.45, 0.1]} castShadow receiveShadow material={sofaFabric}>
            <boxGeometry args={[0.2, 0.4, 1.1]} />
          </mesh>
          {/* Throw cushions */}
          <mesh position={[-0.8, 0.45, 0.25]} rotation={[0.2, 0.1, 0]} castShadow>
            <boxGeometry args={[0.45, 0.35, 0.12]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.8} />
          </mesh>
          <mesh position={[0.2, 0.45, 0.25]} rotation={[0.2, -0.15, 0]} castShadow>
            <boxGeometry args={[0.45, 0.35, 0.12]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.8} />
          </mesh>
        </group>

        {/* Coffee Table */}
        <group position={[-0.2, 0, -0.2]}>
          {/* Wood tabletop */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[1.5, 0.06, 0.8]} />
          </mesh>
          {/* Metal hairpin legs */}
          <mesh position={[-0.65, 0.17, -0.3]} material={darkMetal}>
            <cylinderGeometry args={[0.015, 0.015, 0.34]} />
          </mesh>
          <mesh position={[0.65, 0.17, -0.3]} material={darkMetal}>
            <cylinderGeometry args={[0.015, 0.015, 0.34]} />
          </mesh>
          <mesh position={[-0.65, 0.17, 0.3]} material={darkMetal}>
            <cylinderGeometry args={[0.015, 0.015, 0.34]} />
          </mesh>
          <mesh position={[0.65, 0.17, 0.3]} material={darkMetal}>
            <cylinderGeometry args={[0.015, 0.015, 0.34]} />
          </mesh>
        </group>

        {/* TV Console & Smart TV mounted on North-facing partition */}
        <group position={[0, 0, -3.4]}>
          {/* Credenza / Media console cabinet */}
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[2.4, 0.5, 0.45]} />
          </mesh>
          {/* Smart OLED TV */}
          <group position={[0, 1.3, 0.1]}>
            {/* TV Bezel / Frame */}
            <mesh castShadow material={darkMetal}>
              <boxGeometry args={[2.0, 1.15, 0.04]} />
            </mesh>
            {/* TV Screen Display */}
            <mesh position={[0, 0, 0.022]}>
              <planeGeometry args={[1.94, 1.09]} />
              <meshBasicMaterial
                color={isTvOn ? '#38bdf8' : '#05070e'}
              />
            </mesh>
            {/* Dynamic emissive light if TV is turned on */}
            {isTvOn && (
              <pointLight
                position={[0, 0, 0.6]}
                intensity={1.2}
                distance={4.0}
                color="#7dd3fc"
              />
            )}
          </group>
        </group>
      </group>

      {/* ========================================================= */}
      {/* KITCHEN FURNITURE                                         */}
      {/* ========================================================= */}
      <group position={[-8.0, 0, 4.0]}>
        {/* Main Kitchen Counter (L-Shape along West & North walls) */}
        <group position={[-2.8, 0, 0]}>
          {/* Counter base cabinet */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={darkMetal}>
            <boxGeometry args={[0.8, 0.9, 6.0]} />
          </mesh>
          {/* Countertop surface */}
          <mesh position={[0, 0.92, 0]} castShadow receiveShadow material={marbleTop}>
            <boxGeometry args={[0.88, 0.06, 6.08]} />
          </mesh>

          {/* Stainless steel Sink & Chrome Faucet */}
          <group position={[0, 0.93, 1.2]}>
            <mesh castShadow receiveShadow material={stainlessSteel}>
              <boxGeometry args={[0.55, 0.02, 0.8]} />
            </mesh>
            {/* Faucet stem */}
            <mesh position={[-0.2, 0.2, 0]} material={chrome}>
              <cylinderGeometry args={[0.02, 0.02, 0.35]} />
            </mesh>
          </group>

          {/* Induction Stove / Cooktop */}
          <group position={[0, 0.95, -1.0]}>
            <mesh castShadow receiveShadow material={darkMetal}>
              <boxGeometry args={[0.6, 0.02, 0.8]} />
            </mesh>
            {/* 4 Induction Burner Rings */}
            {[-0.2, 0.2].map((x, xi) =>
              [-0.2, 0.2].map((z, zi) => (
                <mesh key={`burner_${xi}_${zi}`} position={[x, 0.015, z]}>
                  <cylinderGeometry args={[0.1, 0.1, 0.005, 24]} />
                  <meshStandardMaterial
                    color={isStoveOn ? '#ef4444' : '#334155'}
                    emissive={isStoveOn ? '#f87171' : '#000000'}
                    emissiveIntensity={isStoveOn ? 3.0 : 0}
                  />
                </mesh>
              ))
            )}
            {/* Stove heat glow pointLight */}
            {isStoveOn && (
              <pointLight position={[0, 0.3, 0]} intensity={1.8} distance={2.5} color="#f87171" />
            )}
          </group>
        </group>

        {/* Smart Refrigerator (ESSENTIAL) */}
        <group position={[-2.8, 0, -2.8]}>
          {/* Main Fridge Cabinet */}
          <mesh position={[0, 1.05, 0]} castShadow receiveShadow material={stainlessSteel}>
            <boxGeometry args={[0.85, 2.1, 0.9]} />
          </mesh>
          {/* Door divider and sleek handles */}
          <mesh position={[0.43, 1.05, 0]} material={chrome}>
            <boxGeometry args={[0.02, 0.01, 0.88]} />
          </mesh>
          <mesh position={[0.45, 1.2, 0.15]} material={chrome}>
            <cylinderGeometry args={[0.015, 0.015, 0.6]} />
          </mesh>
          <mesh position={[0.45, 1.2, -0.15]} material={chrome}>
            <cylinderGeometry args={[0.015, 0.015, 0.6]} />
          </mesh>
          {/* Power status indicator LED on fridge door */}
          <mesh position={[0.44, 1.8, 0.3]}>
            <sphereGeometry args={[0.012, 16, 16]} />
            <meshStandardMaterial
              color={fridgeDevice?.state.power === 'on' ? '#10b981' : '#ef4444'}
              emissive={fridgeDevice?.state.power === 'on' ? '#10b981' : '#ef4444'}
              emissiveIntensity={2.0}
            />
          </mesh>
        </group>

        {/* Kitchen Island */}
        <group position={[0.5, 0, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={darkMetal}>
            <boxGeometry args={[1.2, 0.9, 2.4]} />
          </mesh>
          <mesh position={[0, 0.92, 0]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[1.35, 0.06, 2.55]} />
          </mesh>
          {/* 2 Modern Bar Stools */}
          {[-0.6, 0.6].map((z, idx) => (
            <group key={`stool_${idx}`} position={[0.85, 0, z]}>
              <mesh position={[0, 0.65, 0]} castShadow material={sofaFabric}>
                <cylinderGeometry args={[0.2, 0.2, 0.08, 24]} />
              </mesh>
              <mesh position={[0, 0.32, 0]} material={chrome}>
                <cylinderGeometry args={[0.02, 0.02, 0.64]} />
              </mesh>
              <mesh position={[0, 0.02, 0]} material={chrome}>
                <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* ========================================================= */}
      {/* BEDROOM FURNITURE                                         */}
      {/* ========================================================= */}
      <group position={[1.0, 0, -4.0]}>
        {/* Soft bedroom rug */}
        <mesh position={[0, 0.01, -0.4]} receiveShadow>
          <planeGeometry args={[3.8, 3.4]} />
          <meshStandardMaterial color="#e0e7ff" roughness={0.9} />
        </mesh>

        {/* King Size Bed */}
        <group position={[0, 0, -1.8]}>
          {/* Headboard against North wall */}
          <mesh position={[0, 0.8, -1.25]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[2.4, 1.2, 0.12]} />
          </mesh>
          {/* Bed frame */}
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[2.1, 0.3, 2.3]} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, 0.42, 0.05]} castShadow receiveShadow material={porcelain}>
            <boxGeometry args={[1.98, 0.26, 2.15]} />
          </mesh>
          {/* Cozy Duvet / Quilt */}
          <mesh position={[0, 0.48, 0.3]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.18, 1.6]} />
            <meshStandardMaterial color="#6366f1" roughness={0.8} />
          </mesh>
          {/* Pillows */}
          <mesh position={[-0.55, 0.6, -0.75]} rotation={[-0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.65, 0.18, 0.45]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>
          <mesh position={[0.55, 0.6, -0.75]} rotation={[-0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.65, 0.18, 0.45]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>

          {/* Left & Right Nightstands */}
          {[-1.3, 1.3].map((x, i) => (
            <group key={`nightstand_${i}`} position={[x, 0, -0.9]}>
              <mesh position={[0, 0.25, 0]} castShadow receiveShadow material={woodFurniture}>
                <boxGeometry args={[0.5, 0.5, 0.45]} />
              </mesh>
              {/* Bedside Lamp */}
              <mesh position={[0, 0.55, 0]} material={chrome}>
                <cylinderGeometry args={[0.015, 0.015, 0.1]} />
              </mesh>
              <mesh position={[0, 0.68, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.18, 0.2, 16]} />
                <meshStandardMaterial color="#fef08a" roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Bedroom Wardrobe / Closet on East wall */}
        <group position={[4.0, 0, 0]}>
          <mesh position={[0, 1.25, 0]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[0.65, 2.4, 2.6]} />
          </mesh>
          {/* Sliding door seam */}
          <mesh position={[-0.33, 1.25, 0]} material={darkMetal}>
            <boxGeometry args={[0.01, 2.35, 0.02]} />
          </mesh>
        </group>

        {/* Wall AC Unit on North Wall */}
        <group position={[0, 2.3, -3.7]}>
          <mesh castShadow receiveShadow material={porcelain}>
            <boxGeometry args={[1.2, 0.35, 0.28]} />
          </mesh>
          {/* AC Vent Louver */}
          <mesh position={[0, -0.1, 0.14]} material={darkMetal}>
            <boxGeometry args={[1.05, 0.04, 0.02]} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* BATHROOM FURNITURE                                        */}
      {/* ========================================================= */}
      <group position={[-8.0, 0, -4.0]}>
        {/* Modern Toilet */}
        <group position={[-2.8, 0, 1.2]}>
          {/* Toilet bowl */}
          <mesh position={[0, 0.22, 0]} castShadow material={porcelain}>
            <cylinderGeometry args={[0.22, 0.18, 0.44, 24]} />
          </mesh>
          {/* Toilet tank */}
          <mesh position={[-0.18, 0.55, 0]} castShadow material={porcelain}>
            <boxGeometry args={[0.25, 0.45, 0.42]} />
          </mesh>
        </group>

        {/* Floating Vanity & Sink with Mirror on West wall */}
        <group position={[-2.8, 0, -1.5]}>
          {/* Cabinet */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[0.55, 0.5, 1.2]} />
          </mesh>
          {/* Porcelain Basin */}
          <mesh position={[0, 0.72, 0]} castShadow material={porcelain}>
            <boxGeometry args={[0.45, 0.12, 0.7]} />
          </mesh>
          {/* Chrome Faucet */}
          <mesh position={[-0.18, 0.88, 0]} material={chrome}>
            <cylinderGeometry args={[0.015, 0.015, 0.22]} />
          </mesh>
          {/* Wall Mirror */}
          <mesh position={[-0.26, 1.5, 0]} material={chrome}>
            <boxGeometry args={[0.02, 0.9, 1.1]} />
          </mesh>
        </group>

        {/* Walk-in Glass Shower Stall */}
        <group position={[2.5, 0, -2.5]}>
          {/* Shower Tray Base */}
          <mesh position={[0, 0.04, 0]} receiveShadow material={porcelain}>
            <boxGeometry args={[1.6, 0.08, 1.6]} />
          </mesh>
          {/* Glass Enclosure Panel */}
          <mesh position={[-0.8, 1.1, 0]}>
            <boxGeometry args={[0.05, 2.1, 1.6]} />
            <meshPhysicalMaterial
              color="#ffffff"
              transparent
              opacity={0.3}
              roughness={0.05}
              transmission={0.85}
            />
          </mesh>
          {/* Chrome Shower Head & Column */}
          <mesh position={[0.4, 1.4, -0.75]} material={chrome}>
            <cylinderGeometry args={[0.015, 0.015, 1.4]} />
          </mesh>
          <mesh position={[0.4, 2.15, -0.6]} material={chrome}>
            <cylinderGeometry args={[0.14, 0.14, 0.03, 24]} />
          </mesh>
        </group>

        {/* Modern Ceramic Toilet */}
        <group position={[-2.8, 0, 1.2]} rotation={[0, Math.PI / 2, 0]}>
          {/* Toilet Base Bowl */}
          <mesh position={[0, 0.22, 0.15]} castShadow receiveShadow material={porcelain}>
            <cylinderGeometry args={[0.2, 0.16, 0.44, 20]} />
          </mesh>
          <mesh position={[0, 0.42, 0.22]} castShadow material={porcelain}>
            <sphereGeometry args={[0.22, 20, 20]} />
          </mesh>
          {/* Toilet Water Tank */}
          <mesh position={[0, 0.55, -0.16]} castShadow material={porcelain}>
            <boxGeometry args={[0.42, 0.55, 0.24]} />
          </mesh>
          {/* Tank Lid */}
          <mesh position={[0, 0.84, -0.16]} material={porcelain}>
            <boxGeometry args={[0.45, 0.05, 0.26]} />
          </mesh>
          {/* Dual Chrome Flush Buttons */}
          <mesh position={[0, 0.87, -0.16]} material={chrome}>
            <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
          </mesh>
          {/* Toilet Seat & Lid */}
          <mesh position={[0, 0.45, 0.2]} material={porcelain}>
            <boxGeometry args={[0.38, 0.04, 0.44]} />
          </mesh>
        </group>

        {/* Tankless Water Heater on North Wall */}
        <group position={[-2.8, 1.8, -3.6]}>
          <mesh castShadow material={porcelain}>
            <boxGeometry args={[0.3, 0.55, 0.22]} />
          </mesh>
          {/* Status LED */}
          <mesh position={[0.16, 0, 0]}>
            <sphereGeometry args={[0.015, 16, 16]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* GARAGE FURNITURE                                          */}
      {/* ========================================================= */}
      <group position={[-8.0, 0, 12.0]}>
        {/* Sleek Modern Electric Sedan Car */}
        <group position={[0.5, 0, 0]}>
          {/* Lower Chassis */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={carBodyMat}>
            <boxGeometry args={[2.2, 0.45, 4.4]} />
          </mesh>
          {/* Upper Cabin & Roof */}
          <mesh position={[0, 0.85, -0.2]} castShadow receiveShadow material={carBodyMat}>
            <boxGeometry args={[1.9, 0.6, 2.5]} />
          </mesh>
          {/* Dark Tinted Windshield & Windows */}
          <mesh position={[0, 0.85, 0.9]} rotation={[0.45, 0, 0]}>
            <planeGeometry args={[1.8, 0.65]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>
          {/* 4 Wheels */}
          {[-1.15, 1.15].map((x, xi) =>
            [-1.4, 1.4].map((z, zi) => (
              <group key={`wheel_${xi}_${zi}`} position={[x, 0.3, z]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={rubberMat}>
                  <cylinderGeometry args={[0.32, 0.32, 0.22, 24]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} material={chrome}>
                  <cylinderGeometry args={[0.18, 0.18, 0.23, 16]} />
                </mesh>
              </group>
            ))
          )}
          {/* Headlights (Front is South / +Z) */}
          <mesh position={[-0.8, 0.4, 2.21]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.8, 0.4, 2.21]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* Workbench with Shelves along West wall */}
        <group position={[-3.3, 0, -1.0]}>
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow material={woodFurniture}>
            <boxGeometry args={[0.65, 0.96, 2.4]} />
          </mesh>
          <mesh position={[0, 1.4, 0]} castShadow receiveShadow material={darkMetal}>
            <boxGeometry args={[0.35, 0.05, 2.2]} />
          </mesh>
        </group>

        {/* Main Electrical Breaker Switch Panel (ESSENTIAL) */}
        <group position={[-3.6, 1.6, -3.0]}>
          <mesh castShadow material={darkMetal}>
            <boxGeometry args={[0.12, 0.6, 0.45]} />
          </mesh>
          {/* Main Circuit Toggle Switch */}
          <mesh position={[0.07, 0, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.03]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* TERRACE FURNITURE (1st Floor Y = 3.0)                     */}
      {/* ========================================================= */}
      <group position={[10.0, 3.0, 4.0]}>
        {/* Outdoor Patio Dining Table */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow material={woodFurniture}>
          <cylinderGeometry args={[0.65, 0.65, 0.05, 24]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={darkMetal}>
          <cylinderGeometry args={[0.03, 0.03, 0.4]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={darkMetal}>
          <cylinderGeometry args={[0.3, 0.3, 0.03, 24]} />
        </mesh>

        {/* 2 Outdoor Lounge Chairs */}
        {[-1.0, 1.0].map((x, i) => (
          <group key={`patio_chair_${i}`} position={[x, 0, 0]} rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow material={woodFurniture}>
              <boxGeometry args={[0.6, 0.06, 0.6]} />
            </mesh>
            <mesh position={[0, 0.55, 0.26]} castShadow material={woodFurniture}>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
            </mesh>
            {/* Legs */}
            <mesh position={[-0.25, 0.12, -0.25]} material={darkMetal}>
              <cylinderGeometry args={[0.015, 0.015, 0.24]} />
            </mesh>
            <mesh position={[0.25, 0.12, -0.25]} material={darkMetal}>
              <cylinderGeometry args={[0.015, 0.015, 0.24]} />
            </mesh>
          </group>
        ))}

        {/* Overhead Modern Pergola Slats */}
        <group position={[0, 2.7, 0]}>
          {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((z, idx) => (
            <mesh key={`pergola_${idx}`} position={[0, 0, z]} castShadow material={woodFurniture}>
              <boxGeometry args={[7.2, 0.1, 0.15]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};
