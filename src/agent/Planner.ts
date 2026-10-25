import { Intent, PlanStep } from '../types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../types/world';
import { DeviceTypeRegistry } from './WorldModel';

interface WorldContextSnapshot {
  rooms: RoomZone[];
  devices: DeviceEntity[];
  doors: DoorEntity[];
  people: PersonEntity[];
}

export class Planner {
  /**
   * Generates candidate plan steps by evaluating intent against device capabilities.
   */
  static plan(intent: Intent, world: WorldContextSnapshot): PlanStep[] {
    const rawSteps: PlanStep[] = [];
    const { devices, doors, people } = world;

    // Helper: which rooms are occupied
    const occupiedRoomIds = new Set(people.map((p) => p.currentRoom));

    // 1. LEAVE HOME PLAN
    if (intent.goal === 'leave_home') {
      // Step A: Turn off hazardous cooking appliances
      const stove = devices.find((d) => d.type === 'stove' && d.state.power === 'on');
      if (stove) {
        rawSteps.push({
          id: `step_${stove.id}_off`,
          deviceId: stove.id,
          deviceName: stove.name,
          deviceType: stove.type,
          room: stove.room,
          action: 'turn_off',
          targetState: { power: 'off', temperature: 0 },
          currentState: { ...stove.state },
          reason: 'De-energize active thermal cooktop before departure.',
          isEssential: false,
          approved: true,
        });
      }

      // Step B: Turn off non-essential lights, fans, TV across residence
      devices.forEach((dev) => {
        if (dev.criticality === 'ESSENTIAL') return; // Do not touch essentials
        if (dev.type === 'light' && dev.state.power === 'on') {
          rawSteps.push({
            id: `step_${dev.id}_off`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_off',
            targetState: { power: 'off' },
            currentState: { ...dev.state },
            reason: 'Conserve energy in unoccupied residence.',
            isEssential: false,
            approved: true,
          });
        }
        if (dev.type === 'fan' && dev.state.power === 'on') {
          rawSteps.push({
            id: `step_${dev.id}_off`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_off',
            targetState: { power: 'off' },
            currentState: { ...dev.state },
            reason: 'Turn off ceiling fan upon departure.',
            isEssential: false,
            approved: true,
          });
        }
        if (dev.type === 'tv' && dev.state.power === 'on') {
          rawSteps.push({
            id: `step_${dev.id}_off`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_off',
            targetState: { power: 'off' },
            currentState: { ...dev.state },
            reason: 'Turn off media console.',
            isEssential: false,
            approved: true,
          });
        }
        if (dev.type === 'pool_filter' && dev.state.power === 'on') {
          rawSteps.push({
            id: `step_${dev.id}_off`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_off',
            targetState: { power: 'off', filtering: false },
            currentState: { ...dev.state },
            reason: 'Power down pool filtration pump upon departure.',
            isEssential: false,
            approved: true,
          });
        }
      });

      // Step C: Close garage door if open
      const garageDoor = devices.find((d) => d.type === 'garage_door');
      if (garageDoor && garageDoor.state.open) {
        rawSteps.push({
          id: `step_${garageDoor.id}_close`,
          deviceId: garageDoor.id,
          deviceName: garageDoor.name,
          deviceType: garageDoor.type,
          room: garageDoor.room,
          action: 'close',
          targetState: { open: false },
          currentState: { ...garageDoor.state },
          reason: 'Lower overhead garage door to enclose structure.',
          isEssential: false,
          approved: true,
        });
      }

      // Step D: Lock perimeter locks (main entrance, terrace, garage deadbolt)
      const perimeterLockIds = ['main_door_lock', 'garage_door_lock', 'terrace_door_lock'];
      perimeterLockIds.forEach((id) => {
        const lockDev = devices.find((d) => d.id === id);
        if (lockDev && !lockDev.state.locked) {
          rawSteps.push({
            id: `step_${lockDev.id}_lock`,
            deviceId: lockDev.id,
            deviceName: lockDev.name,
            deviceType: lockDev.type,
            room: lockDev.room,
            action: 'lock',
            targetState: { locked: true },
            currentState: { ...lockDev.state },
            reason: 'Secure perimeter deadbolt against unauthorized access.',
            isEssential: false,
            approved: true,
          });
        }
      });
    }

    // 2. PREPARE SLEEP PLAN
    else if (intent.goal === 'prepare_sleep') {
      // Ensure perimeter locks are locked
      ['main_door_lock', 'terrace_door_lock'].forEach((id) => {
        const lock = devices.find((d) => d.id === id);
        if (lock && !lock.state.locked) {
          rawSteps.push({
            id: `step_${lock.id}_lock`,
            deviceId: lock.id,
            deviceName: lock.name,
            deviceType: lock.type,
            room: lock.room,
            action: 'lock',
            targetState: { locked: true },
            currentState: { ...lock.state },
            reason: 'Arm night perimeter security.',
            isEssential: false,
            approved: true,
          });
        }
      });

      // Turn off hall, kitchen, garage lights, TV
      devices.forEach((dev) => {
        if (dev.criticality === 'ESSENTIAL') return;
        if (dev.room !== 'bedroom' && dev.type === 'light' && dev.state.power === 'on') {
          rawSteps.push({
            id: `step_${dev.id}_off`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_off',
            targetState: { power: 'off' },
            currentState: { ...dev.state },
            reason: 'Extinguish day lighting during night sleep routine.',
            isEssential: false,
            approved: true,
          });
        }
        if (dev.room === 'hall' && dev.type === 'tv' && dev.state.power === 'on') {
          rawSteps.push({
            id: `step_${dev.id}_off`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_off',
            targetState: { power: 'off' },
            currentState: { ...dev.state },
            reason: 'Power off entertainment console for quiet sleep.',
            isEssential: false,
            approved: true,
          });
        }
      });
    }

    // 3. TURN OFF UNOCCUPIED ROOMS
    else if (intent.goal === 'turn_off_unoccupied') {
      devices.forEach((dev) => {
        if (dev.criticality === 'ESSENTIAL') return;
        // If room is NOT occupied by any person
        if (!occupiedRoomIds.has(dev.room)) {
          if ((dev.type === 'light' || dev.type === 'fan' || dev.type === 'tv') && dev.state.power === 'on') {
            rawSteps.push({
              id: `step_${dev.id}_off`,
              deviceId: dev.id,
              deviceName: dev.name,
              deviceType: dev.type,
              room: dev.room,
              action: 'turn_off',
              targetState: { power: 'off' },
              currentState: { ...dev.state },
              reason: `Optimize power: ${dev.room} is currently unoccupied.`,
              isEssential: false,
              approved: true,
            });
          }
        }
      });
    }

    // 4. MAKE COZY
    else if (intent.goal === 'make_cozy') {
      const targetRoom = intent.scope === 'all' ? 'hall' : intent.scope;
      devices
        .filter((d) => d.room === targetRoom)
        .forEach((dev) => {
          if (dev.type === 'light' && dev.state.power === 'on') {
            rawSteps.push({
              id: `step_${dev.id}_dim`,
              deviceId: dev.id,
              deviceName: dev.name,
              deviceType: dev.type,
              room: dev.room,
              action: 'dim',
              targetState: { level: 25 },
              currentState: { ...dev.state },
              reason: 'Create warm, relaxed ambient lighting atmosphere.',
              isEssential: false,
              approved: true,
            });
          }
        });
    }

    // 5. DIRECT OR GENERIC COMMANDS BY DEVICE CAPABILITY
    else {
      // Find matching devices by scope or type
      devices.forEach((dev) => {
        const matchesScope =
          intent.scope === 'all' ||
          dev.room === intent.scope ||
          dev.type === intent.scope ||
          dev.id === intent.scope ||
          (intent.scope.includes(dev.room) && intent.scope.includes(dev.type)) ||
          (intent.scope === 'fan' && dev.type === 'fan') ||
          (intent.scope === 'fans' && dev.type === 'fan') ||
          (intent.scope === 'light' && dev.type === 'light') ||
          (intent.scope === 'lights' && dev.type === 'light') ||
          (intent.scope === 'ac' && dev.type === 'ac') ||
          (intent.scope === 'tv' && dev.type === 'tv') ||
          (intent.scope === 'doors' && (dev.type === 'door_lock' || dev.type === 'garage_door' || dev.type === 'gate')) ||
          (intent.scope === 'locks' && dev.type === 'door_lock') ||
          (intent.scope === 'exterior' && (dev.room === 'lawn' || dev.id.includes('main_door') || dev.id.includes('garage') || dev.id.includes('gate'))) ||
          (intent.scope === 'sensors' && (dev.type === 'safety_sensor' || dev.type === 'siren')) ||
          (intent.scope === 'microwave' && (dev.id.includes('microwave') || dev.name.toLowerCase().includes('microwave'))) ||
          (intent.scope === 'appliances' && (dev.type === 'stove' || dev.type === 'water_heater' || dev.type === 'refrigerator' || dev.type === 'tv' || dev.type === 'fan' || dev.id.includes('microwave')));

        if (!matchesScope) return;

        const schema = DeviceTypeRegistry.get(dev.type);
        if (!schema) return;

        const isLockGoal =
          (intent.goal.includes('lock') && !intent.goal.includes('unlock')) ||
          intent.goal === 'secure_perimeter' ||
          intent.goal === 'lock_perimeter' ||
          intent.goal === 'lock_all_doors';

        const isUnlockGoal =
          intent.goal === 'unlock_doors' ||
          intent.goal === 'unlock';

        const isOpenGoal =
          intent.goal === 'open_door' ||
          intent.goal === 'open';

        const isCloseGoal =
          intent.goal === 'close_door' ||
          intent.goal === 'close';

        const isOffGoal =
          intent.goal.includes('turn_off') ||
          intent.goal === 'off' ||
          intent.goal === 'power_off' ||
          intent.goal === 'deactivate';

        const isOnGoal =
          intent.goal.includes('turn_on') ||
          intent.goal === 'on' ||
          intent.goal === 'power_on' ||
          intent.goal === 'activate';

        // When scope is a generic room, safety infrastructure (sensors, gas valves) is not an ambient controllable appliance
        const isGenericRoomScope = dev.room === intent.scope;
        if (isGenericRoomScope) {
          if (dev.type === 'safety_sensor' || dev.type === 'siren' || dev.type === 'gas_valve') {
            return;
          }
          if (dev.criticality === 'ESSENTIAL' && isOffGoal) {
            return;
          }
        }

        if (isOffGoal && dev.state.power === 'on') {
          rawSteps.push({
            id: `step_${dev.id}_off`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_off',
            targetState: { power: 'off' },
            currentState: { ...dev.state },
            reason: `User requested power deactivation for ${dev.name}.`,
            isEssential: dev.criticality === 'ESSENTIAL',
            approved: true,
          });
        } else if (isOnGoal && dev.state.power === 'off') {
          rawSteps.push({
            id: `step_${dev.id}_on`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'turn_on',
            targetState: { power: 'on' },
            currentState: { ...dev.state },
            reason: `User requested illumination/activation for ${dev.name}.`,
            isEssential: dev.criticality === 'ESSENTIAL',
            approved: true,
          });
        } else if (isOpenGoal && (dev.type === 'door_lock' || dev.type === 'garage_door' || dev.type === 'gate')) {
          if (dev.state.open !== true) {
            rawSteps.push({
              id: `step_${dev.id}_open`,
              deviceId: dev.id,
              deviceName: dev.name,
              deviceType: dev.type,
              room: dev.room,
              action: 'open',
              targetState: { open: true },
              currentState: { ...dev.state },
              reason: `User requested opening ${dev.name}.`,
              isEssential: false,
              approved: true,
            });
          }
        } else if (isCloseGoal && (dev.type === 'door_lock' || dev.type === 'garage_door' || dev.type === 'gate')) {
          if (dev.state.open !== false) {
            rawSteps.push({
              id: `step_${dev.id}_close`,
              deviceId: dev.id,
              deviceName: dev.name,
              deviceType: dev.type,
              room: dev.room,
              action: 'close',
              targetState: { open: false },
              currentState: { ...dev.state },
              reason: `User requested closing ${dev.name}.`,
              isEssential: false,
              approved: true,
            });
          }
        } else if (isUnlockGoal && dev.type === 'door_lock' && dev.state.locked) {
          rawSteps.push({
            id: `step_${dev.id}_unlock`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'unlock',
            targetState: { locked: false },
            currentState: { ...dev.state },
            reason: `User requested unlock for ${dev.name}.`,
            isEssential: false,
            approved: true,
          });
        } else if (isLockGoal && dev.type === 'door_lock' && !dev.state.locked) {
          const isInterior = dev.room === 'bedroom' || dev.room === 'bathroom' || dev.room === 'kitchen';
          const hasIndoorOccupants = people.some((p) => p.currentRoom !== 'lawn');

          rawSteps.push({
            id: `step_${dev.id}_lock`,
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            room: dev.room,
            action: 'lock',
            targetState: { locked: true },
            currentState: { ...dev.state },
            reason: isInterior && hasIndoorOccupants
              ? `Caution: Locking interior door ${dev.name} while occupants are inside residence.`
              : `Lock requested for ${dev.name}.`,
            isEssential: false,
            riskSeverity: isInterior && hasIndoorOccupants ? 'HIGH' : 'NONE',
            approved: !(isInterior && hasIndoorOccupants),
          });
        }
      });
    }

    // TOPOLOGICAL DEPENDENCY SORTING
    // Dependency rules:
    // 1. Close door / garage BEFORE locking door / garage
    // 2. Shut off thermal/stove BEFORE extinguishing lights
    // 3. Power off appliances BEFORE arming locks
    return rawSteps.sort((a, b) => {
      // Prioritize closing garage/doors before locking
      if (a.action === 'close' && b.action === 'lock') return -1;
      if (a.action === 'lock' && b.action === 'close') return 1;

      // Prioritize de-energizing high hazards (stove) before lights
      if (a.deviceType === 'stove' && b.deviceType === 'light') return -1;
      if (a.deviceType === 'light' && b.deviceType === 'stove') return 1;

      // Prioritize appliances off before locking exterior
      if (a.action === 'turn_off' && b.action === 'lock') return -1;
      if (a.action === 'lock' && b.action === 'turn_off') return 1;

      return 0;
    });
  }
}
