import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

export const VisualDevices: React.FC = () => {
  const devices = useWorldStore((state) => state.devices);
  const rooms = useWorldStore((state) => state.rooms);
  const cameraMode = useWorldStore((state) => state.cameraMode);

  // References for continuous animations
  const fanBladeRef = useRef<THREE.Group>(null);
  const cameraPanRef = useRef<THREE.Group>(null);
  const garageRollupRef = useRef<THREE.Group>(null);

  const hallFan = devices.find((d) => d.id === 'hall_fan');
  const isFanOn = hallFan?.state.power === 'on';

  const garageDoor = devices.find((d) => d.id === 'garage_door');
  const isGarageOpen = garageDoor?.state.open;

  useFrame((state, delta) => {
    // 1. Fan blade rotation
    if (fanBladeRef.current && isFanOn) {
      fanBladeRef.current.rotation.y += delta * 9.0;
    }

    // 2. Security camera gentle pan
    if (cameraPanRef.current) {
      cameraPanRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.6;
    }

    // 3. Garage roll-up door animation
    if (garageRollupRef.current) {
      const targetY = isGarageOpen ? 2.3 : 0.0;
      garageRollupRef.current.position.y = THREE.MathUtils.damp(
        garageRollupRef.current.position.y,
        targetY,
        4.0,
        delta
      );
    }
  });

  return (
    <group name="visual_devices">
      {/* ========================================================= */}
      {/* 3D ROOM BILLBOARD LABELS                                  */}
      {/* ========================================================= */}
      {cameraMode !== 'person' &&
        rooms.map((room) => {
          const { min, max } = room.bounds;
          const cx = (min[0] + max[0]) / 2;
          const cz = (min[2] + max[2]) / 2;

          return (
            <group key={`label_${room.id}`} position={[cx, 3.2, cz]}>
              <Billboard follow={true}>
                <Text
                  fontSize={0.42}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.03}
                  outlineColor="#0f172a"
                >
                  {room.name}
                </Text>
              </Billboard>
            </group>
          );
        })}

      {/* ========================================================= */}
      {/* SIMULATED REAL LIGHTS                                     */}
      {/* ========================================================= */}
      {devices
        .filter((d) => d.type === 'light')
        .map((light) => {
          const isOn = light.state.power === 'on';
          const intensity = isOn ? (light.state.level ? light.state.level / 100 : 1.0) * 1.6 : 0;
          const lightColor = light.room === 'lawn' ? '#e2e8f0' : '#fef3c7';

          return (
            <group key={`light_visual_${light.id}`} position={light.position}>
              {/* Visible light fixture */}
              <mesh castShadow>
                <cylinderGeometry args={[0.15, 0.22, 0.12, 16]} />
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </mesh>
              <mesh position={[0, -0.06, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={isOn ? lightColor : '#475569'} />
              </mesh>

              {/* Real illumination point light */}
              {isOn && (
                <pointLight
                  intensity={intensity}
                  distance={light.room === 'lawn' ? 14 : 9}
                  decay={2}
                  color={lightColor}
                  castShadow
                  shadow-mapSize-width={512}
                  shadow-mapSize-height={512}
                />
              )}
            </group>
          );
        })}

      {/* ========================================================= */}
      {/* CEILING FAN IN MAIN HALL                                  */}
      {/* ========================================================= */}
      <group position={[1.0, 2.65, 4.0]}>
        {/* Fan mount rod */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
        {/* Fan motor hub */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.08, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.6} />
        </mesh>

        {/* 4 Rotating Fan Blades */}
        <group ref={fanBladeRef}>
          {[0, 1, 2, 3].map((idx) => {
            const angle = (idx * Math.PI) / 2;
            return (
              <group key={`blade_${idx}`} rotation={[0, angle, 0]}>
                <mesh position={[0.55, 0, 0]} castShadow>
                  <boxGeometry args={[0.9, 0.015, 0.15]} />
                  <meshStandardMaterial color="#854d0e" roughness={0.4} />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>

      {/* ========================================================= */}
      {/* SECURITY CAMERAS                                          */}
      {/* ========================================================= */}
      {devices
        .filter((d) => d.type === 'camera')
        .map((cam) => {
          const isOn = cam.state.power === 'on';

          return (
            <group key={`cam_visual_${cam.id}`} position={cam.position}>
              {/* Wall mounting bracket */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 0.12]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              {/* Pan assembly */}
              <group ref={cameraPanRef} position={[0.08, 0, 0]}>
                <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.06, 0.07, 0.18, 16]} />
                  <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.2} />
                </mesh>
                {/* Lens */}
                <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.02, 16]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>
                {/* Red recording LED */}
                <mesh position={[0.08, 0.05, 0]}>
                  <sphereGeometry args={[0.012, 16, 16]} />
                  <meshBasicMaterial color={isOn ? '#ef4444' : '#475569'} />
                </mesh>
              </group>
            </group>
          );
        })}

      {/* ========================================================= */}
      {/* MOTORIZED GARAGE ROLLUP DOOR                              */}
      {/* ========================================================= */}
      <group position={[-8.0, 0, 15.8]}>
        {/* Overhead Track Housing */}
        <mesh position={[0, 2.7, 0]}>
          <boxGeometry args={[3.4, 0.25, 0.35]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
        {/* Animated Slatted Rollup Door Leaf */}
        <group ref={garageRollupRef}>
          <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.2, 2.5, 0.05]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
