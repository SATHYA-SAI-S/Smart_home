import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

export const CameraController: React.FC = () => {
  const { camera } = useThree();
  const orbitRef = useRef<any>(null);

  const cameraMode = useWorldStore((state) => state.cameraMode);
  const selectedPersonId = useWorldStore((state) => state.selectedPersonId);
  const selectedRoomId = useWorldStore((state) => state.selectedRoomId);
  const people = useWorldStore((state) => state.people);
  const rooms = useWorldStore((state) => state.rooms);
  const fov = useWorldStore((state) => state.fov);

  const currentLookAt = useRef(new THREE.Vector3(0, 1, 4));

  // Sync FOV when changed
  useEffect(() => {
    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);

  useFrame((_, delta) => {
    const controlledPerson = people.find((p) => p.id === selectedPersonId);
    const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

    let targetCamPos = new THREE.Vector3(18, 16, 24);
    let targetLookAt = new THREE.Vector3(0, 1, 4);

    if (cameraMode === 'person' && controlledPerson) {
      let eyeHeight = 1.62;
      if (controlledPerson.attributes.ageGroup === 'elderly') eyeHeight = 1.50;
      if (controlledPerson.attributes.ageGroup === 'child') eyeHeight = 1.05;

      const px = controlledPerson.position[0];
      const pz = controlledPerson.position[2];

      targetCamPos.set(px, eyeHeight, pz);

      // Look direction from rotationY
      const lookDist = 5.0;
      const lx = px + Math.sin(controlledPerson.rotationY) * lookDist;
      const lz = pz + Math.cos(controlledPerson.rotationY) * lookDist;
      targetLookAt.set(lx, eyeHeight * 0.95, lz);

      // Disable orbit controls in first person
      if (orbitRef.current) orbitRef.current.enabled = false;

      // Snappier dampening in person view so player doesn't feel floaty lag
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 25, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 25, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 25, delta);

      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetLookAt.x, 25, delta);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetLookAt.y, 25, delta);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, targetLookAt.z, 25, delta);

      camera.lookAt(currentLookAt.current);
      return;
    }

    if (cameraMode === 'room') {
      targetCamPos.set(...selectedRoom.cameraPosition);
      targetLookAt.set(...selectedRoom.cameraTarget);

      if (orbitRef.current) orbitRef.current.enabled = false;

      // Smooth camera tweening into room corner
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 6, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 6, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 6, delta);

      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetLookAt.x, 6, delta);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetLookAt.y, 6, delta);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, targetLookAt.z, 6, delta);

      camera.lookAt(currentLookAt.current);
      return;
    }

    if (cameraMode === 'top') {
      targetCamPos.set(0, 26, 6);
      targetLookAt.set(0, 0, 6);

      if (orbitRef.current) orbitRef.current.enabled = false;

      // Smooth tween to top-down floorplan view
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 6, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 6, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 6, delta);

      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetLookAt.x, 6, delta);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetLookAt.y, 6, delta);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, targetLookAt.z, 6, delta);

      camera.lookAt(currentLookAt.current);
      return;
    }

    // Mode 'orbit'
    if (orbitRef.current) {
      orbitRef.current.enabled = true;
    }
  });

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enabled={cameraMode === 'orbit'}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={4}
      maxDistance={45}
      target={[0, 1, 4]}
      enableDamping={true}
      dampingFactor={0.05}
    />
  );
};
