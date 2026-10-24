import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../../../store/useWorldStore';

interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  doorId?: string;
}

// Static solid walls & heavy furniture obstacles
const STATIC_OBSTACLES: ObstacleBox[] = [
  // Exterior walls
  { minX: -12.2, maxX: 6.2, minZ: -8.2, maxZ: -7.8 }, // North outer
  { minX: -12.2, maxX: -11.8, minZ: -8.0, maxZ: 16.0 }, // West outer
  { minX: 5.8, maxX: 6.2, minZ: -8.0, maxZ: 0.0 }, // East bedroom outer
  // Interior dividing walls (excluding door openings)
  { minX: -4.1, maxX: -3.9, minZ: -8.0, maxZ: -0.2 }, // Bed vs Bath
  { minX: -4.1, maxX: -3.9, minZ: 0.0, maxZ: 3.4 }, // Hall vs Kitchen (North part)
  { minX: -4.1, maxX: -3.9, minZ: 4.6, maxZ: 8.0 }, // Hall vs Kitchen (South part)
  { minX: -12.0, maxX: -8.6, minZ: -0.1, maxZ: 0.1 }, // Bath vs Kitchen (Left)
  { minX: -7.4, maxX: -4.0, minZ: -0.1, maxZ: 0.1 }, // Bath vs Kitchen (Right)
  { minX: -12.0, maxX: -8.6, minZ: 7.9, maxZ: 8.1 }, // Kitchen vs Garage (Left)
  { minX: -7.4, maxX: -4.0, minZ: 7.9, maxZ: 8.1 }, // Kitchen vs Garage (Right)
  { minX: -4.0, maxX: 0.4, minZ: -0.1, maxZ: 0.1 }, // Hall vs Bedroom (Left)
  { minX: 1.6, maxX: 6.0, minZ: -0.1, maxZ: 0.1 }, // Hall vs Bedroom (Right)
  { minX: -4.0, maxX: 0.4, minZ: 7.9, maxZ: 8.1 }, // Hall South exterior (Left)
  { minX: 1.6, maxX: 6.0, minZ: 7.9, maxZ: 8.1 }, // Hall South exterior (Right)
  { minX: 5.8, maxX: 6.2, minZ: 0.0, maxZ: 3.0 }, // Hall to Terrace (North)
  { minX: 5.8, maxX: 6.2, minZ: 5.0, maxZ: 8.0 }, // Hall to Terrace (South)
  // Major furniture collision
  { minX: -1.0, maxX: 3.0, minZ: -5.0, maxZ: -2.7 }, // King Bed
  { minX: -11.8, maxX: -10.0, minZ: 1.0, maxZ: 7.0 }, // Kitchen counter
  { minX: -8.0, maxX: -6.0, minZ: 3.0, maxZ: 5.0 }, // Kitchen island
  { minX: 0.0, maxX: 3.2, minZ: 4.6, maxZ: 6.2 }, // Hall couch
  { minX: -9.5, maxX: -6.5, minZ: 10.0, maxZ: 14.5 }, // Garage Car
];

export const PeopleController: React.FC = () => {
  const people = useWorldStore((state) => state.people);
  const selectedPersonId = useWorldStore((state) => state.selectedPersonId);
  const updatePersonPosition = useWorldStore((state) => state.updatePersonPosition);
  const updatePersonActivity = useWorldStore((state) => state.updatePersonActivity);
  const doors = useWorldStore((state) => state.doors);
  const toggleDoor = useWorldStore((state) => state.toggleDoor);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const controlledYaw = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      // 'E' Key: Interact with nearest door
      if (e.key.toLowerCase() === 'e') {
        const controlled = people.find((p) => p.id === selectedPersonId);
        if (controlled) {
          const [px, , pz] = controlled.position;
          // Find nearest door within 2.0 meters
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
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [people, selectedPersonId, doors, toggleDoor]);

  // Collision detection checking static obstacles AND closed doors
  const checkCollision = (x: number, z: number, radius = 0.3): boolean => {
    // 1. Check static obstacles
    for (const obs of STATIC_OBSTACLES) {
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
        // Bounding box for closed door
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

  useFrame((_, delta) => {
    // 1. CONTROLLED PERSON UPDATE
    const controlledPerson = people.find((p) => p.id === selectedPersonId);
    if (controlledPerson) {
      let moveX = 0;
      let moveZ = 0;

      const forward = keysPressed.current['w'] || keysPressed.current['arrowup'];
      const backward = keysPressed.current['s'] || keysPressed.current['arrowdown'];
      const left = keysPressed.current['a'] || keysPressed.current['arrowleft'];
      const right = keysPressed.current['d'] || keysPressed.current['arrowright'];

      // Yaw rotation with Q/E or smooth arrow turning if not using mouse
      if (keysPressed.current['q']) controlledYaw.current += delta * 2.5;
      if (keysPressed.current['e'] && !keysPressed.current['w']) controlledYaw.current -= delta * 2.5;

      if (forward) moveZ -= 1;
      if (backward) moveZ += 1;
      if (left) moveX -= 1;
      if (right) moveX += 1;

      const isMoving = moveX !== 0 || moveZ !== 0;

      if (isMoving) {
        // Normalize movement vector
        const length = Math.hypot(moveX, moveZ);
        const normX = moveX / length;
        const normZ = moveZ / length;

        // Rotate movement vector according to yaw
        const sin = Math.sin(controlledYaw.current);
        const cos = Math.cos(controlledYaw.current);
        const worldMoveX = normX * cos + normZ * sin;
        const worldMoveZ = -normX * sin + normZ * cos;

        // Facing direction rotation
        const facingAngle = Math.atan2(worldMoveX, worldMoveZ);

        const speed = controlledPerson.attributes.mobility === 'reduced' ? 2.2 : 3.8;
        const proposedX = controlledPerson.position[0] + worldMoveX * speed * delta;
        const proposedZ = controlledPerson.position[2] + worldMoveZ * speed * delta;

        let nextX = controlledPerson.position[0];
        let nextZ = controlledPerson.position[2];

        // Test X axis movement
        if (!checkCollision(proposedX, nextZ)) {
          nextX = proposedX;
        }
        // Test Z axis movement
        if (!checkCollision(nextX, proposedZ)) {
          nextZ = proposedZ;
        }

        updatePersonPosition(controlledPerson.id, [nextX, 0, nextZ], facingAngle);
        if (controlledPerson.activity !== 'walking') {
          updatePersonActivity(controlledPerson.id, 'walking');
        }
      } else {
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
        const target: [number, number, number] = [-8.0, 0, -4.0];
        const dist = Math.hypot(target[0] - npc.position[0], target[2] - npc.position[2]);

        if (dist > 0.4) {
          const dirX = (target[0] - npc.position[0]) / dist;
          const dirZ = (target[2] - npc.position[2]) / dist;
          const speed = 1.2;
          const nextX = npc.position[0] + dirX * speed * delta;
          const nextZ = npc.position[2] + dirZ * speed * delta;
          const angle = Math.atan2(dirX, dirZ);

          updatePersonPosition(npc.id, [nextX, 0, nextZ], angle);
          if (npc.activity !== 'walking') updatePersonActivity(npc.id, 'walking');
        } else {
          if (npc.activity !== 'bathing') updatePersonActivity(npc.id, 'bathing');
        }
        return;
      }

      // Default autonomous waypoint patrol
      if (npc.pathWaypoints && npc.pathWaypoints.length > 0) {
        const waypoints = npc.pathWaypoints;
        const currentIndex = npc.targetWaypointIndex || 0;
        const currentTarget = waypoints[currentIndex];

        const dist = Math.hypot(
          currentTarget[0] - npc.position[0],
          currentTarget[2] - npc.position[2]
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
          // Walk towards waypoint
          const dirX = (currentTarget[0] - npc.position[0]) / dist;
          const dirZ = (currentTarget[2] - npc.position[2]) / dist;
          const speed = npc.attributes.mobility === 'reduced' ? 1.1 : 1.8;
          const nextX = npc.position[0] + dirX * speed * delta;
          const nextZ = npc.position[2] + dirZ * speed * delta;
          const angle = Math.atan2(dirX, dirZ);

          updatePersonPosition(npc.id, [nextX, 0, nextZ], angle);
          if (npc.activity !== 'walking') {
            updatePersonActivity(npc.id, 'walking');
          }
        }
      }
    });
  });

  return null;
};
