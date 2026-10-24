import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  doorId?: string;
}

// Comprehensive static solid obstacles (walls, major furniture, fixtures)
const STATIC_OBSTACLES: ObstacleBox[] = [
  // Exterior walls
  { minX: -12.2, maxX: 6.2, minZ: -8.2, maxZ: -7.8 }, // North outer
  { minX: -12.2, maxX: -11.8, minZ: -8.0, maxZ: 16.0 }, // West outer
  { minX: 5.8, maxX: 6.2, minZ: -8.0, maxZ: 0.0 }, // East bedroom outer
  // Interior dividing walls
  { minX: -4.1, maxX: -3.9, minZ: -8.0, maxZ: -2.6 }, // Bed vs Bath (North segment)
  { minX: -4.1, maxX: -3.9, minZ: -1.4, maxZ: 0.0 }, // Bed vs Bath (South segment, doorway at Z=-2.0)
  { minX: -4.1, maxX: -3.9, minZ: 0.0, maxZ: 3.4 }, // Hall vs Kitchen (North)
  { minX: -4.1, maxX: -3.9, minZ: 4.6, maxZ: 8.0 }, // Hall vs Kitchen (South)
  { minX: -12.0, maxX: -4.0, minZ: -0.15, maxZ: 0.15 }, // Bath vs Kitchen (Solid Wall)
  { minX: -12.0, maxX: -8.6, minZ: 7.9, maxZ: 8.1 }, // Kitchen vs Garage (Left)
  { minX: -7.4, maxX: -4.0, minZ: 7.9, maxZ: 8.1 }, // Kitchen vs Garage (Right)
  { minX: -4.0, maxX: 2.6, minZ: -0.15, maxZ: 0.15 }, // Hall vs Bedroom (Left, behind TV console)
  { minX: 3.8, maxX: 6.0, minZ: -0.15, maxZ: 0.15 }, // Hall vs Bedroom (Right, doorway at X=3.2)
  { minX: -4.0, maxX: 0.4, minZ: 7.9, maxZ: 8.1 }, // Hall South exterior (Left)
  { minX: 1.6, maxX: 6.0, minZ: 7.9, maxZ: 8.1 }, // Hall South exterior (Right)
  { minX: 5.8, maxX: 6.2, minZ: 0.0, maxZ: 3.0 }, // Hall to Terrace (North)
  { minX: 5.8, maxX: 6.2, minZ: 5.0, maxZ: 8.0 }, // Hall to Terrace (South)
  // Major furniture & fixture obstacles
  { minX: -0.5, maxX: 2.5, minZ: -5.5, maxZ: -2.7 }, // King Bed
  { minX: 4.2, maxX: 5.8, minZ: -4.5, maxZ: -1.5 }, // Bedroom Dresser
  { minX: -0.5, maxX: 2.8, minZ: 4.5, maxZ: 6.2 }, // Hall couch
  { minX: -0.5, maxX: 2.3, minZ: 0.2, maxZ: 0.8 }, // Hall TV console
  { minX: -11.8, maxX: -9.8, minZ: 0.8, maxZ: 7.2 }, // Kitchen counter & Refrigerator
  { minX: -8.2, maxX: -6.0, minZ: 2.8, maxZ: 5.2 }, // Kitchen island
  { minX: -11.2, maxX: -10.2, minZ: -6.2, maxZ: -4.8 }, // Bathroom Vanity & Sink
  { minX: -11.2, maxX: -10.2, minZ: -3.4, maxZ: -2.2 }, // Bathroom Toilet
  { minX: -6.4, maxX: -4.6, minZ: -7.4, maxZ: -5.6 }, // Bathroom Shower
  { minX: -9.5, maxX: -6.0, minZ: 9.8, maxZ: 14.5 }, // Garage Car
  { minX: -11.8, maxX: -10.8, minZ: 10.0, maxZ: 14.0 }, // Garage Workbench
  { minX: 2.0, maxX: 3.0, minZ: 8.9, maxZ: 9.9 }, // Clown Sudharshini
  { minX: 13.7, maxX: 14.5, minZ: 13.1, maxZ: 14.1 }, // Pool Filter Pump Box
  // Front fence segments
  { minX: -14.0, maxX: -0.3, minZ: 19.6, maxZ: 20.2 },
  { minX: 2.3, maxX: 16.0, minZ: 19.6, maxZ: 20.2 },
  // 1st Floor Terrace perimeter railings (only when elevated Y >= 2.0)
  { minX: 13.6, maxX: 14.2, minZ: 0.0, maxZ: 8.0, minY: 2.0, maxY: 6.0 },
  { minX: 6.0, maxX: 14.0, minZ: -0.2, maxZ: 0.3, minY: 2.0, maxY: 6.0 },
  { minX: 7.6, maxX: 14.0, minZ: 7.7, maxZ: 8.1, minY: 2.0, maxY: 6.0 },
];

export const PeopleController: React.FC = () => {
  const { camera } = useThree();
  const people = useWorldStore((state) => state.people);
  const selectedPersonId = useWorldStore((state) => state.selectedPersonId);
  const updatePersonPosition = useWorldStore((state) => state.updatePersonPosition);
  const updatePersonActivity = useWorldStore((state) => state.updatePersonActivity);
  const doors = useWorldStore((state) => state.doors);
  const toggleDoor = useWorldStore((state) => state.toggleDoor);
  const setDoorOpen = useWorldStore((state) => state.setDoorOpen);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const controlledYaw = useRef<number>(0);
  const velocityY = useRef<number>(0);
  const isJumping = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Space: Jump
      if (e.code === 'Space' || key === ' ') {
        const controlled = people.find((p) => p.id === selectedPersonId);
        if (controlled) {
          const currentY = controlled.position[1];
          // Check ground elevation
          const [px, , pz] = controlled.position;
          let floorHeight = 0;
          if (px >= 6.2 && px <= 7.6 && pz >= 7.8 && pz <= 11.8) {
            const progress = THREE.MathUtils.clamp((11.6 - pz) / (11.6 - 7.9), 0, 1);
            floorHeight = progress * 3.0;
          } else if (px >= 6.2 && px <= 13.8 && pz >= 0.2 && pz <= 7.8 && currentY >= 1.5) {
            floorHeight = 3.0;
          } else if (px >= 8.7 && px <= 13.5 && pz >= 10.9 && pz <= 16.3) {
            floorHeight = -0.5;
          }
          if (currentY <= floorHeight + 0.1) {
            velocityY.current = 5.2; // Vertical jump launch impulse
            isJumping.current = true;
          }
        }
      }

      // 'F' or 'E' Key: Interact with nearest door
      if (key === 'f' || (key === 'e' && cameraMode !== 'person')) {
        const controlled = people.find((p) => p.id === selectedPersonId);
        if (controlled) {
          const [px, , pz] = controlled.position;
          let nearestDoorId = '';
          let nearestDist = 2.0;

          doors.forEach((door) => {
            const dist = Math.hypot(door.position[0] - px, door.position[2] - pz);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestDoorId = door.id;
            }
          });

          if (nearestDoorId) {
            toggleDoor(nearestDoorId);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [people, selectedPersonId, doors, toggleDoor]);

  // Collision detection checking obstacles and closed doors with sliding
  const checkCollision = (x: number, z: number, y = 0, radius = 0.25): boolean => {
    // 1. Check static obstacles
    for (const obs of STATIC_OBSTACLES) {
      if (obs.minY !== undefined && y < obs.minY) continue;
      if (obs.maxY !== undefined && y > obs.maxY) continue;

      if (
        x + radius >= obs.minX &&
        x - radius <= obs.maxX &&
        z + radius >= obs.minZ &&
        z - radius <= obs.maxZ
      ) {
        return true;
      }
    }

    // 2. Check closed doors as dynamic obstacles
    for (const door of doors) {
      if (!door.isOpen) {
        const dx = door.position[0];
        const dz = door.position[2];
        const halfW = door.width / 2;
        const minX = dx - (door.rotationY === 0 ? halfW : 0.15);
        const maxX = dx + (door.rotationY === 0 ? halfW : 0.15);
        const minZ = dz - (door.rotationY === 0 ? 0.15 : halfW);
        const maxZ = dz + (door.rotationY === 0 ? 0.15 : halfW);

        if (
          x + radius >= minX &&
          x - radius <= maxX &&
          z + radius >= minZ &&
          z - radius <= maxZ
        ) {
          return true;
        }
      }
    }

    return false;
  };

  const thirdPersonYaw = useWorldStore((state) => state.thirdPersonYaw);
  const setThirdPersonYaw = useWorldStore((state) => state.setThirdPersonYaw);
  const cameraMode = useWorldStore((state) => state.cameraMode);

  useFrame((_, delta) => {
    // 1. ROTATION CONTROLS (Q / E) IN 3RD PERSON VIEW
    if (cameraMode === 'person') {
      if (keysPressed.current['q']) {
        setThirdPersonYaw(thirdPersonYaw - 2.2 * delta);
      }
      if (keysPressed.current['e']) {
        setThirdPersonYaw(thirdPersonYaw + 2.2 * delta);
      }
    }

    // 2. CONTROLLED PERSON UPDATE
    const controlledPerson = people.find((p) => p.id === selectedPersonId);
    if (controlledPerson) {
      const forward = keysPressed.current['w'] || keysPressed.current['arrowup'];
      const backward = keysPressed.current['s'] || keysPressed.current['arrowdown'];
      const left = keysPressed.current['a'] || keysPressed.current['arrowleft'];
      const right = keysPressed.current['d'] || keysPressed.current['arrowright'];

      // Extract camera's planar forward & right vectors directly from real-time camera view orientation
      // In Three.js: (0, 0, -1) is camera forward (into screen), (1, 0, 0) is camera right (right of screen)
      const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      camForward.y = 0;
      if (camForward.lengthSq() > 0.0001) camForward.normalize();

      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      camRight.y = 0;
      if (camRight.lengthSq() > 0.0001) camRight.normalize();

      let inputForward = 0;
      let inputRight = 0;
      if (forward) inputForward += 1;
      if (backward) inputForward -= 1;
      if (right) inputRight += 1;
      if (left) inputRight -= 1;

      const moveVec = new THREE.Vector3();
      moveVec.addScaledVector(camForward, inputForward);
      moveVec.addScaledVector(camRight, inputRight);

      const isMoving = moveVec.lengthSq() > 0.001;

      const [px, py, pz] = controlledPerson.position;

      // Calculate floor height (Ground = 0, Staircase = ramp 0 to 3.0, 1st-floor Terrace = 3.0)
      let floorHeight = 0;
      if (px >= 6.2 && px <= 7.6 && pz >= 7.8 && pz <= 11.8) {
        const progress = THREE.MathUtils.clamp((11.6 - pz) / (11.6 - 7.9), 0, 1);
        floorHeight = progress * 3.0;
      } else if (px >= 6.2 && px <= 13.8 && pz >= 0.2 && pz <= 7.8 && py >= 1.5) {
        floorHeight = 3.0;
      } else if (px >= 8.7 && px <= 13.5 && pz >= 10.9 && pz <= 16.3) {
        floorHeight = -0.5; // Submerged in pool water!
      }

      // Auto-open unlocked doors when the avatar approaches
      doors.forEach((door) => {
        if (!door.isOpen && !door.isLocked) {
          const dist = Math.hypot(door.position[0] - px, door.position[2] - pz);
          if (dist < 1.6) {
            setDoorOpen(door.id, true);
          }
        }
      });

      // Gravity & Jumping physics
      velocityY.current -= 15.0 * delta;
      let nextY = py + velocityY.current * delta;
      if (nextY <= floorHeight) {
        nextY = floorHeight;
        velocityY.current = 0;
        isJumping.current = false;
      }

      let nextX = px;
      let nextZ = pz;
      let facingAngle = controlledPerson.rotationY;

      if (isMoving) {
        moveVec.normalize();
        // Turn avatar smoothly to face direction of movement
        const targetFacing = Math.atan2(moveVec.x, moveVec.z);
        // Smooth rotation angle interpolation
        let diff = targetFacing - facingAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        facingAngle += diff * Math.min(1, delta * 15.0);

        const speed = controlledPerson.attributes.mobility === 'reduced' ? 2.2 : 3.8;
        const proposedX = px + moveVec.x * speed * delta;
        const proposedZ = pz + moveVec.z * speed * delta;

        // Sliding collision response with 0.25m avatar radius
        const blockedFull = checkCollision(proposedX, proposedZ, nextY, 0.25);
        if (!blockedFull) {
          nextX = proposedX;
          nextZ = proposedZ;
        } else {
          // Slide along X
          if (!checkCollision(proposedX, pz, nextY, 0.25)) {
            nextX = proposedX;
          }
          // Slide along Z
          if (!checkCollision(px, proposedZ, nextY, 0.25)) {
            nextZ = proposedZ;
          }
        }

        updatePersonPosition(controlledPerson.id, [nextX, nextY, nextZ], facingAngle);
        if (controlledPerson.activity !== 'walking') {
          updatePersonActivity(controlledPerson.id, 'walking');
        }
      } else {
        // Update vertical position even when standing still (falling / landing)
        if (Math.abs(nextY - py) > 0.001) {
          updatePersonPosition(controlledPerson.id, [nextX, nextY, nextZ], facingAngle);
        }
        if (controlledPerson.activity === 'walking') {
          updatePersonActivity(controlledPerson.id, 'idle');
        }
      }
    }

    // 2. AUTONOMOUS NPC MOVEMENT & SCRIPTED ROUTINES
    people.forEach((npc) => {
      if (npc.id === selectedPersonId) return; // Skip controlled person

      // Scripted scenario: "Grandpa goes into the bathroom and stays there"
      if (npc.scriptedRoutine === 'stay_in_bathroom') {
        const [nx, ny, nz] = npc.position;

        // Auto-open unlocked doors when NPC approaches
        doors.forEach((door) => {
          if (!door.isOpen && !door.isLocked) {
            const d = Math.hypot(door.position[0] - nx, door.position[2] - nz);
            if (d < 1.6) setDoorOpen(door.id, true);
          }
        });

        // Determine destination waypoint routing safely through doorways
        let target: [number, number, number] = [-7.5, 0, -3.5];
        if (nz > 0.2) {
          // If in hall/kitchen: route to hall side of bedroom doorway first
          if (Math.hypot(3.2 - nx, 1.5 - nz) > 0.4) {
            target = [3.2, 0, 1.5];
          } else {
            target = [3.2, 0, 0.0];
          }
        } else if (nz >= -0.2 && nz <= 0.2 && nx >= 2.6) {
          // In bedroom doorway threshold: step into bedroom walkway
          target = [3.2, 0, -1.8];
        } else if (nx > -3.8) {
          // Inside bedroom: route to bedroom side of ensuite door
          if (Math.hypot(-2.0 - nx, -2.0 - nz) > 0.4) {
            target = [-2.0, 0, -2.0];
          } else {
            target = [-4.0, 0, -2.0];
          }
        } else {
          // Inside bathroom: final resting spot
          target = [-7.5, 0, -3.5];
        }

        const dist = Math.hypot(target[0] - nx, target[2] - nz);
        if (dist > 0.3) {
          const dirX = (target[0] - nx) / dist;
          const dirZ = (target[2] - nz) / dist;
          const speed = 1.1;
          const proposedX = nx + dirX * speed * delta;
          const proposedZ = nz + dirZ * speed * delta;
          const angle = Math.atan2(dirX, dirZ);

          // Check collisions with walls - NEVER pass through walls
          if (!checkCollision(proposedX, proposedZ, ny, 0.25)) {
            updatePersonPosition(npc.id, [proposedX, ny, proposedZ], angle);
          } else if (!checkCollision(proposedX, nz, ny, 0.25)) {
            updatePersonPosition(npc.id, [proposedX, ny, nz], angle);
          } else if (!checkCollision(nx, proposedZ, ny, 0.25)) {
            updatePersonPosition(npc.id, [nx, ny, proposedZ], angle);
          }
          if (npc.activity !== 'walking') updatePersonActivity(npc.id, 'walking');
        } else {
          // Reached intermediate or final waypoint
          if (nx <= -4.0) {
            if (npc.activity !== 'bathing') updatePersonActivity(npc.id, 'bathing');
          }
        }
        return;
      }

      // Default autonomous waypoint patrol
      if (npc.pathWaypoints && npc.pathWaypoints.length > 0) {
        const [nx, ny, nz] = npc.position;

        // Auto-open unlocked doors when NPC approaches
        doors.forEach((door) => {
          if (!door.isOpen && !door.isLocked) {
            const d = Math.hypot(door.position[0] - nx, door.position[2] - nz);
            if (d < 1.6) setDoorOpen(door.id, true);
          }
        });

        const waypoints = npc.pathWaypoints;
        const currentIndex = npc.targetWaypointIndex || 0;
        const currentTarget = waypoints[currentIndex];

        const dist = Math.hypot(
          currentTarget[0] - nx,
          currentTarget[2] - nz
        );

        if (dist < 0.4) {
          // Arrived at waypoint -> pause idle
          if (npc.activity === 'walking') {
            updatePersonActivity(npc.id, 'resting');
          }
          const timer = (npc.idleTimer || 5) - delta;
          if (timer <= 0) {
            // Pick next waypoint
            const nextIdx = (currentIndex + 1) % waypoints.length;
            npc.targetWaypointIndex = nextIdx;
            npc.idleTimer = Math.random() * 4 + 4; // 4 to 8 sec idle
            updatePersonActivity(npc.id, 'walking');
          } else {
            npc.idleTimer = timer;
          }
        } else {
          // Walk towards waypoint with wall collision prevention
          const dirX = (currentTarget[0] - nx) / dist;
          const dirZ = (currentTarget[2] - nz) / dist;
          const speed = npc.attributes.mobility === 'reduced' ? 1.0 : 1.6;
          const proposedX = nx + dirX * speed * delta;
          const proposedZ = nz + dirZ * speed * delta;
          const angle = Math.atan2(dirX, dirZ);

          // Verify collision before moving - NEVER pass through walls
          const targetY = currentTarget[1] !== undefined ? currentTarget[1] : ny;
          if (!checkCollision(proposedX, proposedZ, targetY, 0.25)) {
            updatePersonPosition(npc.id, [proposedX, targetY, proposedZ], angle);
            if (npc.activity !== 'walking') {
              updatePersonActivity(npc.id, 'walking');
            }
          } else {
            // Slide along unobstructed axis
            if (!checkCollision(proposedX, nz, targetY, 0.25)) {
              updatePersonPosition(npc.id, [proposedX, targetY, nz], angle);
            } else if (!checkCollision(nx, proposedZ, targetY, 0.25)) {
              updatePersonPosition(npc.id, [nx, targetY, proposedZ], angle);
            } else {
              // Path blocked (e.g. door locked) -> advance to next waypoint
              npc.targetWaypointIndex = (currentIndex + 1) % waypoints.length;
            }
          }
        }
      }
    });
  });

  return null;
};
