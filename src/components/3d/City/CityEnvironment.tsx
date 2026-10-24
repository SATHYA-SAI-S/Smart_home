import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const CityEnvironment: React.FC = () => {
  const car1Ref = useRef<THREE.Group>(null);
  const car2Ref = useRef<THREE.Group>(null);
  const car1WheelsRef = useRef<THREE.Group[]>([]);
  const car2WheelsRef = useRef<THREE.Group[]>([]);
  const ped1Ref = useRef<THREE.Group>(null);
  const ped2Ref = useRef<THREE.Group>(null);
  const ped1LegL = useRef<THREE.Group>(null);
  const ped1LegR = useRef<THREE.Group>(null);
  const ped2LegL = useRef<THREE.Group>(null);
  const ped2LegR = useRef<THREE.Group>(null);

  // Materials
  const asphaltMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85, metalness: 0.1 }),
    []
  );
  const roadLineMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f8fafc' }),
    []
  );
  const yellowLineMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#facc15' }),
    []
  );
  const sidewalkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8, metalness: 0.05 }),
    []
  );
  const groundTerrainMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.9, metalness: 0.0 }),
    []
  );
  const buildingMat1 = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7, metalness: 0.2 }),
    []
  );
  const buildingMat2 = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6, metalness: 0.3 }),
    []
  );
  const buildingMat3 = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8, metalness: 0.1 }),
    []
  );
  const windowGlowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fef08a' }),
    []
  );
  const carRedMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3, metalness: 0.7 }),
    []
  );
  const carBlueMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3, metalness: 0.7 }),
    []
  );
  const tireMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.9 }),
    []
  );
  const wheelRimMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.2 }),
    []
  );

  // Distant city buildings layout (optimized to 6 simple low-poly blocks to prevent laptop lag)
  const buildings = useMemo(() => [
    { x: -50, z: -55, w: 22, h: 28, d: 20, matIdx: 0 },
    { x: 10, z: -60, w: 24, h: 36, d: 22, matIdx: 1 },
    { x: 55, z: -52, w: 20, h: 24, d: 20, matIdx: 2 },
    { x: -65, z: 45, w: 22, h: 26, d: 22, matIdx: 1 },
    { x: 0, z: 65, w: 26, h: 32, d: 24, matIdx: 0 },
    { x: 60, z: 50, w: 22, h: 30, d: 20, matIdx: 2 },
  ], []);

  // Animation Loop for Moving Cars & Pedestrians
  useFrame((_, delta) => {
    // 1. CAR 1 (Driving East along South Lane Z = 24.0 at ~7.5 m/s)
    if (car1Ref.current) {
      car1Ref.current.position.x += delta * 7.5;
      if (car1Ref.current.position.x > 85) {
        car1Ref.current.position.x = -85;
      }
      car1WheelsRef.current.forEach((w) => {
        if (w) w.rotation.x += delta * 18.0;
      });
    }

    // 2. CAR 2 (Driving West along North Lane Z = 27.6 at ~6.5 m/s)
    if (car2Ref.current) {
      car2Ref.current.position.x -= delta * 6.5;
      if (car2Ref.current.position.x < -85) {
        car2Ref.current.position.x = 85;
      }
      car2WheelsRef.current.forEach((w) => {
        if (w) w.rotation.x -= delta * 16.0;
      });
    }

    // 3. PEDESTRIAN 1 (Walking along sidewalk Z = 20.8)
    if (ped1Ref.current) {
      ped1Ref.current.position.x += delta * 1.4;
      if (ped1Ref.current.position.x > 30) ped1Ref.current.position.x = -30;
      const swing = Math.sin(ped1Ref.current.position.x * 4.5) * 0.55;
      if (ped1LegL.current && ped1LegR.current) {
        ped1LegL.current.rotation.x = swing;
        ped1LegR.current.rotation.x = -swing;
      }
    }

    // 4. PEDESTRIAN 2 (Walking along sidewalk across the street Z = 30.8)
    if (ped2Ref.current) {
      ped2Ref.current.position.x -= delta * 1.3;
      if (ped2Ref.current.position.x < -30) ped2Ref.current.position.x = 30;
      const swing = Math.sin(ped2Ref.current.position.x * 4.5) * 0.55;
      if (ped2LegL.current && ped2LegR.current) {
        ped2LegL.current.rotation.x = swing;
        ped2LegR.current.rotation.x = -swing;
      }
    }
  });

  return (
    <group name="city_environment">
      {/* ========================================================= */}
      {/* 1. EXTENSIVE GROUND TERRAIN                                */}
      {/* ========================================================= */}
      <mesh position={[0, -0.15, 0]} receiveShadow material={groundTerrainMat}>
        <boxGeometry args={[220, 0.1, 220]} />
      </mesh>

      {/* ========================================================= */}
      {/* 2. SOUTH CITY ROADWAY (AVENUE)                            */}
      {/* ========================================================= */}
      {/* Asphalt Surface: X=[-100, 100], Z=[21.8, 29.8], width=8m */}
      <mesh position={[0, -0.05, 25.8]} receiveShadow material={asphaltMat}>
        <boxGeometry args={[200, 0.08, 8.0]} />
      </mesh>

      {/* Dashed Center Dividing Lines */}
      {Array.from({ length: 25 }).map((_, i) => {
        const x = -90 + i * 7.5;
        return (
          <mesh key={`dash_${i}`} position={[x, -0.005, 25.8]} material={roadLineMat}>
            <boxGeometry args={[4.0, 0.01, 0.22]} />
          </mesh>
        );
      })}

      {/* Solid Yellow Shoulder Lines */}
      <mesh position={[0, -0.005, 22.1]} material={yellowLineMat}>
        <boxGeometry args={[200, 0.01, 0.18]} />
      </mesh>
      <mesh position={[0, -0.005, 29.5]} material={yellowLineMat}>
        <boxGeometry args={[200, 0.01, 0.18]} />
      </mesh>

      {/* Striped Pedestrian Crosswalk near Front Entrance Gate */}
      {[-1.8, -1.0, -0.2, 0.6, 1.4, 2.2, 3.0, 3.8].map((x, i) => (
        <mesh key={`crosswalk_${i}`} position={[x, -0.004, 25.8]} material={roadLineMat}>
          <boxGeometry args={[0.5, 0.01, 6.8]} />
        </mesh>
      ))}

      {/* North Sidewalk (Adjacent to Residential Front Fence) */}
      <mesh position={[0, -0.02, 20.8]} receiveShadow material={sidewalkMat}>
        <boxGeometry args={[200, 0.12, 1.8]} />
      </mesh>
      {/* South Sidewalk (Across the street) */}
      <mesh position={[0, -0.02, 30.8]} receiveShadow material={sidewalkMat}>
        <boxGeometry args={[200, 0.12, 1.8]} />
      </mesh>

      {/* Street Lamps along the sidewalk */}
      {[-60, -35, -10, 15, 40, 65].map((x, i) => (
        <group key={`lamp_${i}`} position={[x, 0, 20.1]}>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 5.0, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0, 5.0, 0.4]} rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.1, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0, 4.8, 0.8]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* ========================================================= */}
      {/* 3. MOVING CAR 1: RED SPORT COUPE (Driving East +X)       */}
      {/* ========================================================= */}
      <group ref={car1Ref} position={[-20, 0, 24.0]}>
        <mesh position={[0, 0.4, 0]} castShadow material={carRedMat}>
          <boxGeometry args={[3.8, 0.5, 1.9]} />
        </mesh>
        <mesh position={[-0.2, 0.85, 0]} castShadow material={carRedMat}>
          <boxGeometry args={[2.1, 0.52, 1.65]} />
        </mesh>
        <mesh position={[0.9, 0.82, 0]} rotation={[0, 0, -0.45]}>
          <boxGeometry args={[0.08, 0.48, 1.55]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>
        <mesh position={[-1.3, 0.82, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.08, 0.45, 1.55]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>
        {/* Headlights (Front is +X) */}
        <mesh position={[1.92, 0.42, 0.6]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[1.92, 0.42, -0.6]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Taillights */}
        <mesh position={[-1.92, 0.45, 0.6]}>
          <boxGeometry args={[0.05, 0.1, 0.3]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[-1.92, 0.45, -0.6]}>
          <boxGeometry args={[0.05, 0.1, 0.3]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>

        {/* 4 Wheels */}
        {[
          { x: 1.1, z: 0.98, idx: 0 },
          { x: 1.1, z: -0.98, idx: 1 },
          { x: -1.1, z: 0.98, idx: 2 },
          { x: -1.1, z: -0.98, idx: 3 },
        ].map((w) => (
          <group
            key={`c1_wheel_${w.idx}`}
            ref={(el) => {
              if (el) car1WheelsRef.current[w.idx] = el;
            }}
            position={[w.x, 0.32, w.z]}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={tireMat}>
              <cylinderGeometry args={[0.32, 0.32, 0.22, 16]} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} material={wheelRimMat}>
              <cylinderGeometry args={[0.18, 0.18, 0.23, 12]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ========================================================= */}
      {/* 4. MOVING CAR 2: BLUE METROPOLITAN SUV (Driving West -X)  */}
      {/* ========================================================= */}
      <group ref={car2Ref} position={[25, 0, 27.6]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.48, 0]} castShadow material={carBlueMat}>
          <boxGeometry args={[4.2, 0.62, 2.05]} />
        </mesh>
        <mesh position={[-0.25, 1.05, 0]} castShadow material={carBlueMat}>
          <boxGeometry args={[2.5, 0.65, 1.85]} />
        </mesh>
        <mesh position={[1.05, 1.0, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.08, 0.58, 1.75]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>
        <mesh position={[2.12, 0.52, 0.7]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[2.12, 0.52, -0.7]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-2.12, 0.55, 0.7]}>
          <boxGeometry args={[0.05, 0.14, 0.35]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[-2.12, 0.55, -0.7]}>
          <boxGeometry args={[0.05, 0.14, 0.35]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>

        {/* 4 Wheels */}
        {[
          { x: 1.25, z: 1.05, idx: 0 },
          { x: 1.25, z: -1.05, idx: 1 },
          { x: -1.25, z: 1.05, idx: 2 },
          { x: -1.25, z: -1.05, idx: 3 },
        ].map((w) => (
          <group
            key={`c2_wheel_${w.idx}`}
            ref={(el) => {
              if (el) car2WheelsRef.current[w.idx] = el;
            }}
            position={[w.x, 0.36, w.z]}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={tireMat}>
              <cylinderGeometry args={[0.36, 0.36, 0.24, 16]} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} material={wheelRimMat}>
              <cylinderGeometry args={[0.2, 0.2, 0.25, 12]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ========================================================= */}
      {/* 5. WALKING PEDESTRIANS ON SIDEWALK                        */}
      {/* ========================================================= */}
      {/* Pedestrian 1: Walking East along South sidewalk (Z = 20.8) */}
      <group ref={ped1Ref} position={[-15, 0, 20.8]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 1.48, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#fed7aa" />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.18, 0.16, 0.6, 12]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
        <group ref={ped1LegL} position={[-0.1, 0.62, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.06, 0.42, 8, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
        <group ref={ped1LegR} position={[0.1, 0.62, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.06, 0.42, 8, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      </group>

      {/* Pedestrian 2: Walking West along opposite sidewalk (Z = 30.8) */}
      <group ref={ped2Ref} position={[12, 0, 30.8]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 1.48, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.18, 0.16, 0.6, 12]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>
        <group ref={ped2LegL} position={[-0.1, 0.62, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.06, 0.42, 8, 8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
        <group ref={ped2LegR} position={[0.1, 0.62, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.06, 0.42, 8, 8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 6. DISTANT CITY SKYLINE BUILDINGS                         */}
      {/* ========================================================= */}
      {buildings.map((b, i) => {
        const mat = b.matIdx === 0 ? buildingMat1 : b.matIdx === 1 ? buildingMat2 : buildingMat3;
        return (
          <group key={`bldg_${i}`} position={[b.x, b.h / 2 - 0.1, b.z]}>
            <mesh material={mat}>
              <boxGeometry args={[b.w, b.h, b.d]} />
            </mesh>
            {/* Minimal glowing rooftop beacon / penthouse band */}
            <mesh position={[0, b.h / 2 - 0.8, 0]} material={windowGlowMat}>
              <boxGeometry args={[b.w * 0.85, 0.4, b.d * 0.85]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
