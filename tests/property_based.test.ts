import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PolicyEngine } from '../src/agent/PolicyEngine';
import { INITIAL_DEVICES, INITIAL_DOORS, INITIAL_ROOMS } from '../src/data/initialWorld';
import { PlanStep } from '../src/types/agent';

describe('Property-Based Invariant Verification (fast-check)', () => {
  it('Property: For ANY randomized occupancy & device state, NO essential device is ever allowed to be cut', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INITIAL_DEVICES.map((d) => d.id)),
        fc.constantFrom('on', 'off'),
        fc.constantFrom('hall', 'bedroom', 'bathroom', 'kitchen', 'garage', 'terrace', 'lawn'),
        (randomDeviceId, targetPower, randomRoom) => {
          const world = {
            devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
            doors: JSON.parse(JSON.stringify(INITIAL_DOORS)),
            people: [
              {
                id: 'person_pbt',
                name: 'TestPerson',
                color: '#ffffff',
                attributes: { ageGroup: 'adult', mobility: 'high', vulnerability: 0.5, role: 'owner' },
                position: [0, 0, 0] as [number, number, number],
                rotationY: 0,
                currentRoom: randomRoom,
                activity: 'idle',
                isControlled: false,
              },
            ],
            rooms: INITIAL_ROOMS,
          };

          const targetDev = world.devices.find((d: any) => d.id === randomDeviceId)!;
          const candidateStep: PlanStep = {
            id: `pbt_step_${randomDeviceId}`,
            deviceId: targetDev.id,
            deviceName: targetDev.name,
            deviceType: targetDev.type,
            room: targetDev.room,
            action: targetPower === 'on' ? 'turn_on' : 'turn_off',
            targetState: { power: targetPower },
            currentState: { ...targetDev.state },
            reason: 'PBT generated action',
            isEssential: targetDev.criticality === 'ESSENTIAL',
            approved: true,
          };

          const { safePlan } = PolicyEngine.evaluateInvariants([candidateStep], world);
          const isEssential = targetDev.criticality === 'ESSENTIAL';
          const isGasHazard = (targetDev.type === 'gas_valve' || targetDev.id.includes('gas')) && targetPower === 'on' && randomRoom !== 'kitchen';

          if ((isEssential && targetPower === 'off') || isGasHazard) {
            // Must be blocked!
            expect(safePlan[0].isBlockedByInvariant).toBe(true);
            expect(safePlan[0].approved).toBe(false);
          } else {
            // Not cutting essential power
            expect(safePlan[0].isBlockedByInvariant).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: For ANY door and ANY occupant position, locking is strictly BLOCKED if occupant is in toRoom', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INITIAL_DOORS.map((d) => d.id)),
        fc.constantFrom('hall', 'bedroom', 'bathroom', 'kitchen', 'garage', 'terrace', 'lawn'),
        fc.boolean(), // door open/closed
        (doorId, occupantRoom, isDoorOpen) => {
          const world = {
            devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
            doors: JSON.parse(JSON.stringify(INITIAL_DOORS)),
            people: [
              {
                id: 'pbt_person',
                name: 'Occupant',
                color: '#38bdf8',
                attributes: { ageGroup: 'adult', mobility: 'high', vulnerability: 0.2, role: 'resident' },
                position: [0, 0, 0] as [number, number, number],
                rotationY: 0,
                currentRoom: occupantRoom,
                activity: 'idle',
                isControlled: false,
              },
            ],
            rooms: INITIAL_ROOMS,
          };

          const targetDoor = world.doors.find((d: any) => d.id === doorId)!;
          targetDoor.isOpen = isDoorOpen;

          const lockStep: PlanStep = {
            id: `pbt_lock_${doorId}`,
            deviceId: targetDoor.lockDeviceId || targetDoor.id,
            deviceName: targetDoor.name,
            deviceType: 'door_lock',
            room: targetDoor.toRoom,
            action: 'lock',
            targetState: { locked: true },
            currentState: { locked: false },
            reason: 'PBT lock attempt',
            isEssential: false,
            approved: true,
          };

          const { safePlan } = PolicyEngine.evaluateInvariants([lockStep], world);

          const isOccupiedInside = targetDoor.toRoom === occupantRoom;
          if (isOccupiedInside || isDoorOpen) {
            expect(safePlan[0].isBlockedByInvariant).toBe(true);
          } else {
            expect(safePlan[0].isBlockedByInvariant).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
