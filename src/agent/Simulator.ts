import { PlanStep, SimulationDiffItem } from '../types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../types/world';

export interface SimulationResult {
  simulatedDevices: DeviceEntity[];
  simulatedDoors: DoorEntity[];
  diff: SimulationDiffItem[];
  cascadingHazards: string[];
}

export class Simulator {
  /**
   * Clones world state, sequentially applies plan steps,
   * calculates predicted state, and traces cascading side-effects.
   */
  static simulate(
    plan: PlanStep[],
    devices: DeviceEntity[],
    doors: DoorEntity[],
    people: PersonEntity[],
    rooms: RoomZone[]
  ): SimulationResult {
    // Deep clone state
    const clonedDevices: DeviceEntity[] = JSON.parse(JSON.stringify(devices));
    const clonedDoors: DoorEntity[] = JSON.parse(JSON.stringify(doors));
    const diff: SimulationDiffItem[] = [];
    const cascadingHazards: string[] = [];

    // Apply plan steps in sequence
    for (const step of plan) {
      const targetDev = clonedDevices.find((d) => d.id === step.deviceId);
      if (!targetDev) continue;

      // Record diff for each modified property
      for (const [key, val] of Object.entries(step.targetState)) {
        if (targetDev.state[key] !== val) {
          diff.push({
            deviceId: targetDev.id,
            deviceName: targetDev.name,
            room: targetDev.room,
            property: key,
            before: targetDev.state[key],
            after: val,
          });
          targetDev.state[key] = val;
        }
      }

      // Check if this device is mapped to a door
      const mappedDoor = clonedDoors.find(
        (door) => door.lockDeviceId === targetDev.id || door.id === targetDev.id
      );
      if (mappedDoor) {
        if (step.targetState.locked !== undefined) {
          mappedDoor.isLocked = step.targetState.locked;
        }
        if (step.targetState.open !== undefined) {
          mappedDoor.isOpen = step.targetState.open;
        }
      }

      // CASCADING EFFECT 1: Main Electrical Breaker Disconnect
      if (targetDev.id === 'main_switch' && step.targetState.power === 'off') {
        cascadingHazards.push('Main electrical breaker tripped: Cascading total residential blackout.');

        clonedDevices.forEach((d) => {
          if (d.id !== 'main_switch' && d.state.power === 'on') {
            diff.push({
              deviceId: d.id,
              deviceName: d.name,
              room: d.room,
              property: 'power',
              before: 'on',
              after: 'off',
              cascadingEffect: `Powered killed by upstream Main Circuit Breaker trip`,
              hazardCreated:
                d.criticality === 'ESSENTIAL'
                  ? `CRITICAL FAILURE: ${d.name} lost vital power supply`
                  : undefined,
            });
            d.state.power = 'off';
          }
        });
      }
    }

    return {
      simulatedDevices: clonedDevices,
      simulatedDoors: clonedDoors,
      diff,
      cascadingHazards,
    };
  }
}
