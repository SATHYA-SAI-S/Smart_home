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
  const thirdPersonYaw = useWorldStore((state) => state.thirdPersonYaw);
  const thirdPersonPitch = useWorldStore((state) => state.thirdPersonPitch);
  const { gl } = useThree();

  const currentLookAt = useRef(new THREE.Vector3(0, 1, 4));

  // Sync FOV when changed
  useEffect(() => {
    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);

  // Smooth mouse look everywhere in 3rd person (360° horizontal + full vertical pitch)
  useEffect(() => {
    const canvas = gl.domElement;
    let isMouseDown = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (useWorldStore.getState().cameraMode !== 'person') return;
      isMouseDown = true;
      prevX = e.clientX;
      prevY = e.clientY;
      if (e.button === 0 && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (useWorldStore.getState().cameraMode !== 'person') return;
      const isLocked = document.pointerLockElement === canvas;
      if (!isLocked && !isMouseDown) return;

      const movementX = isLocked ? e.movementX : e.clientX - prevX;
      const movementY = isLocked ? e.movementY : e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      const sens = 0.0035;
      const state = useWorldStore.getState();
      state.setThirdPersonYaw(state.thirdPersonYaw - movementX * sens);
      state.setThirdPersonPitch(
        THREE.MathUtils.clamp(state.thirdPersonPitch + movementY * sens, -0.25, 1.25)
      );
    };

    const onPointerUp = () => {
      isMouseDown = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        if (useWorldStore.getState().cameraMode === 'person') {
          if (document.pointerLockElement === canvas) {
            document.exitPointerLock?.();
          } else {
            canvas.requestPointerLock?.();
          }
        }
      }
    };

    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas;
      useWorldStore.getState().setIsPointerLocked(isLocked);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock?.();
      }
    };
  }, [gl]);

  useFrame((_, delta) => {
    const controlledPerson = people.find((p) => p.id === selectedPersonId);
    const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

    let targetCamPos = new THREE.Vector3(18, 16, 24);
    let targetLookAt = new THREE.Vector3(0, 1, 4);

    if (cameraMode === 'person' && controlledPerson) {
      const px = controlledPerson.position[0];
      const py = controlledPerson.position[1];
      const pz = controlledPerson.position[2];

      // Spherical 3rd Person follow camera around avatar (360° yaw, smooth vertical pitch)
      const followDist = 3.2;
      const targetY = py + 1.25;

      const horizontalDist = followDist * Math.cos(thirdPersonPitch);
      const verticalOffset = followDist * Math.sin(thirdPersonPitch);

      let camX = px - Math.sin(thirdPersonYaw) * horizontalDist;
      let camY = targetY + verticalOffset;
      let camZ = pz - Math.cos(thirdPersonYaw) * horizontalDist;

      // Keep camera safely above floor
      if (camY < py + 0.35) camY = py + 0.35;

      // Camera collision prevention: clamp within current room bounds if indoors
      const currentRoom = rooms.find((r) => r.id === controlledPerson.currentRoom);
      if (currentRoom && controlledPerson.currentRoom !== 'lawn') {
        const pad = 0.45;
        camX = THREE.MathUtils.clamp(
          camX,
          currentRoom.bounds.min[0] + pad,
          currentRoom.bounds.max[0] - pad
        );
        camZ = THREE.MathUtils.clamp(
          camZ,
          currentRoom.bounds.min[2] + pad,
          currentRoom.bounds.max[2] - pad
        );
      }

      targetCamPos.set(camX, camY, camZ);
      targetLookAt.set(px, targetY, pz);

      // Disable orbit controls in person view
      if (orbitRef.current) orbitRef.current.enabled = false;

      // Smooth dampening towards 3rd person follow position
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 16, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 16, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 16, delta);

      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetLookAt.x, 18, delta);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetLookAt.y, 18, delta);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, targetLookAt.z, 18, delta);

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
