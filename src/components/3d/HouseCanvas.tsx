import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../../store/useWorldStore';
import { CameraController } from './Cameras/CameraController';
import { FloorAndWalls } from './Rooms/FloorAndWalls';
import { Furniture } from './Rooms/Furniture';
import { Doors } from './Rooms/Doors';
import { LawnAndGarden } from './Rooms/LawnAndGarden';
import { SwimmingPool } from './Rooms/SwimmingPool';
import { VisualDevices } from './Devices/VisualDevices';
import { Avatar } from './People/Avatar';
import { PeopleController } from './People/PeopleController';
import { CityEnvironment } from './City/CityEnvironment';

// Dynamic Day / Night Lighting based on timeOfDay (0 - 24)
const DynamicLighting: React.FC = () => {
  const timeOfDay = useWorldStore((state) => state.timeOfDay);

  const { sunPosition, sunColor, sunIntensity, ambientColor, ambientIntensity } = useMemo(() => {
    // Hour 6: Sunrise, 12: Noon, 18: Sunset, 0: Midnight
    const angle = ((timeOfDay - 6) / 24) * Math.PI * 2;
    const isDay = timeOfDay >= 5.5 && timeOfDay <= 19.5;

    const sunX = Math.cos(angle) * 35;
    const sunY = Math.max(Math.sin(angle) * 35, -5);
    const sunZ = Math.sin(angle * 0.5) * 20;

    let sColor = '#ffffff';
    let sIntensity = 1.6;
    let aColor = '#cbd5e1';
    let aIntensity = 0.5;

    if (timeOfDay < 5.5 || timeOfDay > 20.5) {
      // Night
      sColor = '#60a5fa'; // Moonlight
      sIntensity = 0.2;
      aColor = '#0f172a';
      aIntensity = 0.15;
    } else if (timeOfDay >= 5.5 && timeOfDay <= 8.0) {
      // Golden Sunrise
      sColor = '#fdba74';
      sIntensity = 1.3;
      aColor = '#fed7aa';
      aIntensity = 0.45;
    } else if (timeOfDay >= 17.5 && timeOfDay <= 20.5) {
      // Golden Sunset
      sColor = '#fb923c';
      sIntensity = 1.2;
      aColor = '#fbcfe8';
      aIntensity = 0.4;
    }

    return {
      sunPosition: [sunX, Math.max(sunY, 2), sunZ] as [number, number, number],
      sunColor: sColor,
      sunIntensity: sIntensity,
      ambientColor: aColor,
      ambientIntensity: aIntensity,
    };
  }, [timeOfDay]);

  return (
    <>
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <directionalLight
        position={sunPosition}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={90}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.00005}
        shadow-normalBias={0.035}
      />
      {/* Sky backdrop sphere */}
      <mesh scale={100}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={timeOfDay > 6 && timeOfDay < 19 ? '#0284c7' : '#020617'}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
};

export const HouseCanvas: React.FC = () => {
  const people = useWorldStore((state) => state.people);
  const selectedPersonId = useWorldStore((state) => state.selectedPersonId);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950">
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [18, 16, 24], fov: 65, near: 0.2, far: 250 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true,
        }}
      >
        <Suspense fallback={null}>
          <DynamicLighting />
          <CameraController />

          {/* Surrounding Realistic City & Roadway */}
          <CityEnvironment />

          {/* Architectural House Structure */}
          <FloorAndWalls />
          <Furniture />
          <Doors />
          <LawnAndGarden />
          <SwimmingPool />
          <VisualDevices />

          {/* Inhabitants & Motion Physics */}
          {people.map((person) => (
            <Avatar
              key={person.id}
              person={person}
              isCurrentController={person.id === selectedPersonId}
            />
          ))}
          <PeopleController />
        </Suspense>
      </Canvas>
    </div>
  );
};
