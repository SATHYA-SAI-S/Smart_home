import { 
  PlanStep, 
  RiskFinding, 
  HardInvariant, 
  DeclarativeRule, 
  SimulationDiffItem 
} from '../types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../types/world';

export class PolicyEngine {
  /**
   * Deterministic Hard Invariants.
   * Can NEVER be overridden, bypassed, or dismissed by LLM or user prompts.
   */
  static HARD_INVARIANTS: HardInvariant[] = [
    {
      id: 'invariant_protect_safety_sensors',
      name: 'Protect Safety Sensors and Siren',
      description: 'Never disable or mute smoke, CO, gas or water-leak detectors, or the siren.',
      check: (_, step, world) => {
        const device = world.devices.find((d: DeviceEntity) => d.id === step.deviceId);
        if (!device) return { violated: false };

        const isSafetySensor = 
          device.type === 'safety_sensor' || 
          device.type === 'siren' || 
          device.id.includes('smoke') || 
          device.id.includes('co_detector') || 
          device.id.includes('leak') || 
          device.id.includes('siren');

        const disablesOrMutes = 
          step.targetState.power === 'off' || 
          step.action === 'turn_off' || 
          step.targetState.muted === true;

        if (isSafetySensor && disablesOrMutes) {
          return {
            violated: true,
            reason: `INVARIANT VIOLATION: Never disable or mute safety detectors or siren ("${device.name}").`,
          };
        }
        return { violated: false };
      },
    },
    {
      id: 'invariant_preserve_essential',
      name: 'Preserve Essential Medical & Food Storage Life Support',
      description: 'Under no circumstances can power be cut to ESSENTIAL devices.',
      check: (_, step, world) => {
        const device = world.devices.find((d: DeviceEntity) => d.id === step.deviceId);
        if (!device) return { violated: false };

        const isEssential = device.criticality === 'ESSENTIAL' || device.isEssential;
        const cutsPower = step.targetState.power === 'off';

        if (isEssential && cutsPower) {
          return {
            violated: true,
            reason: `INVARIANT VIOLATION: Device "${device.name}" is tagged as ESSENTIAL. Power disconnect is strictly prohibited.`,
          };
        }
        return { violated: false };
      },
    },
    {
      id: 'invariant_gas_safety',
      name: 'Gas Safety & Active Occupancy Protection',
      description: 'Gas valve or gas appliance on while away, or ignition requested with no occupant present.',
      check: (_, step, world) => {
        const device = world.devices.find((d: DeviceEntity) => d.id === step.deviceId);
        if (!device) return { violated: false };

        const isGasDevice = device.type === 'gas_valve' || device.id.includes('gas');
        const opensOrIgnites = step.targetState.power === 'on' || step.action === 'turn_on';

        if (isGasDevice && opensOrIgnites) {
          const kitchenOccupants = world.people.filter((p: PersonEntity) => p.currentRoom === 'kitchen');
          if (kitchenOccupants.length === 0) {
            return {
              violated: true,
              reason: `INVARIANT VIOLATION: Gas valve or ignition requested for "${device.name}" with no occupant present in kitchen.`,
            };
          }
        }
        return { violated: false };
      },
    },
    {
      id: 'invariant_emergency_egress',
      name: 'Emergency Evacuation & Egress Pathway',
      description: 'While a fire/CO alarm is active, never lock doors, turn off hallway lights, or close gates or garage.',
      check: (_, step, world) => {
        const activeAlarm = world.devices.some(
          (d: DeviceEntity) => (d.type === 'safety_sensor' || d.type === 'siren') && (d.state.alarmActive === true || d.state.power === 'on' && d.type === 'siren')
        );

        if (activeAlarm) {
          // Prohibit locking any door
          if (step.targetState.locked === true || step.action === 'lock') {
            return {
              violated: true,
              reason: `INVARIANT VIOLATION: Emergency egress active! Cannot lock door "${step.deviceName}" while alarm is sounding.`,
            };
          }
          // Prohibit closing gates or garage
          if ((step.deviceType === 'gate' || step.deviceType === 'garage_door') && (step.targetState.open === false || step.action === 'close')) {
            return {
              violated: true,
              reason: `INVARIANT VIOLATION: Emergency egress active! Cannot close exit portal "${step.deviceName}" during evacuation.`,
            };
          }
          // Prohibit turning off hallway lights
          if (step.room === 'hall' && step.deviceType === 'light' && (step.targetState.power === 'off' || step.action === 'turn_off')) {
            return {
              violated: true,
              reason: `INVARIANT VIOLATION: Emergency egress active! Cannot extinguish hallway escape lighting.`,
            };
          }
        }
        return { violated: false };
      },
    },
    {
      id: 'invariant_camera_privacy',
      name: 'Camera & Microphone Privacy Zones',
      description: 'Never enable cameras or microphones in bedrooms, bathrooms or other private rooms.',
      check: (_, step) => {
        const isCameraOrMic = step.deviceType === 'camera' || step.deviceId.includes('camera') || step.deviceId.includes('mic');
        const isPrivateRoom = step.room === 'bedroom' || step.room === 'bathroom';
        const activates = step.targetState.power === 'on' || step.targetState.recording === true || step.action === 'turn_on';

        if (isCameraOrMic && isPrivateRoom && activates) {
          return {
            violated: true,
            reason: `INVARIANT VIOLATION: Surveillance cameras and microphones are strictly prohibited in private room "${step.room}".`,
          };
        }
        return { violated: false };
      },
    },
    {
      id: 'invariant_no_lock_ajar',
      name: 'Prohibit Locking Open Portal Mechanism',
      description: 'Deadbolt cannot engage while door leaf is physically opened.',
      check: (_, step, world) => {
        if (step.targetState.locked !== true) return { violated: false };

        const mappedDoor = world.doors.find(
          (door: DoorEntity) => door.lockDeviceId === step.deviceId || door.id === step.deviceId
        );
        if (!mappedDoor) return { violated: false };

        if (mappedDoor.isOpen) {
          return {
            violated: true,
            reason: `INVARIANT VIOLATION: Cannot lock door "${mappedDoor.name}" because the door is currently open. It must be closed first.`,
          };
        }
        return { violated: false };
      },
    },
    {
      id: 'invariant_anti_entrapment',
      name: 'Anti-Entrapment Occupancy Safety',
      description: 'Doors cannot be locked from outside if people are present in that room.',
      check: (_, step, world) => {
        if (step.targetState.locked !== true) return { violated: false };

        const mappedDoor = world.doors.find(
          (door: DoorEntity) => door.lockDeviceId === step.deviceId || door.id === step.deviceId
        );
        if (!mappedDoor) return { violated: false };

        // Check occupants in toRoom
        const trappedPeople = world.people.filter(
          (p: PersonEntity) => p.currentRoom === mappedDoor.toRoom
        );

        if (trappedPeople.length > 0) {
          const names = trappedPeople.map((p: PersonEntity) => p.name).join(', ');
          return {
            violated: true,
            reason: `INVARIANT VIOLATION: Cannot lock door "${mappedDoor.name}". Occupant(s) [${names}] are inside room "${mappedDoor.toRoom}".`,
          };
        }
        return { violated: false };
      },
    },
  ];

  /**
   * Evaluates all hard invariants against candidate plan steps.
   * Modifies steps in place with blocking status.
   */
  static evaluateInvariants(
    plan: PlanStep[],
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[]; rooms: RoomZone[] }
  ): { safePlan: PlanStep[]; violations: string[] } {
    const violations: string[] = [];

    const evaluatedPlan = plan.map((step) => {
      let isBlocked = false;
      let violationMsg: string | undefined = undefined;

      for (const invariant of this.HARD_INVARIANTS) {
        const result = invariant.check(null, step, world);
        if (result.violated) {
          isBlocked = true;
          violationMsg = result.reason;
          violations.push(result.reason || `Violation of ${invariant.name}`);
          break;
        }
      }

      return {
        ...step,
        isBlockedByInvariant: isBlocked,
        invariantViolationMessage: violationMsg,
        approved: isBlocked ? false : step.approved,
      };
    });

    return { safePlan: evaluatedPlan, violations };
  }

  /**
   * Evaluates soft risk rules using the generic formula:
   * Risk = Severity x Likelihood x Vulnerability x Irreversibility
   */
  static evaluateSoftRisks(
    plan: PlanStep[],
    diff: SimulationDiffItem[],
    rules: DeclarativeRule[],
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[]; timeOfDay: number }
  ): RiskFinding[] {
    const findings: RiskFinding[] = [];
    const activeRules = rules.filter((r) => r.enabled);

    for (const rule of activeRules) {
      // 1. Unattended Hazard Devices (Stove / Oven)
      if (rule.conditionType === 'hazard_unattended') {
        const stove = world.devices.find((d) => d.type === 'stove');
        const isStoveOn = stove?.state.power === 'on';
        const kitchenOccupants = world.people.filter((p) => p.currentRoom === 'kitchen');

        if (isStoveOn && kitchenOccupants.length === 0) {
          const vuln = Math.max(...world.people.map((p) => p.attributes.vulnerability), 0.5);
          const score = 3 * 0.9 * vuln * 1.0;

          findings.push({
            id: `risk_${rule.id}_${Date.now()}`,
            ruleId: rule.id,
            severity: 'HIGH',
            title: 'Unattended Induction Cooktop Hazard',
            explanation: rule.explanation,
            evidence: 'Induction stove is energizing burners with 0 occupants present in Kitchen.',
            suggestedFix: rule.suggestedFix,
            score,
            affectedDevices: [stove!.id],
          });
        }
      }

      // 2. Heating Appliance Unattended (Geyser / Iron / Room Heater / Plug)
      if (rule.conditionType === 'heating_unattended') {
        const heatingDevices = world.devices.filter(
          (d) => d.type === 'water_heater' || d.id.includes('heater') || d.id.includes('iron')
        );

        heatingDevices.forEach((hDev) => {
          const isOn = hDev.state.power === 'on' || plan.some((s) => s.deviceId === hDev.id && s.targetState.power === 'on');
          const roomOccupants = world.people.filter((p) => p.currentRoom === hDev.room);

          if (isOn && roomOccupants.length === 0 && !hDev.state.hasAutoOffTimer) {
            findings.push({
              id: `risk_${rule.id}_${hDev.id}`,
              ruleId: rule.id,
              severity: 'HIGH',
              title: `Unattended Heating Appliance: ${hDev.name}`,
              explanation: rule.explanation,
              evidence: `${hDev.name} is running in unoccupied room "${hDev.room}" with no auto-off timer.`,
              suggestedFix: rule.suggestedFix,
              score: 3 * 0.8 * 0.8 * 1.0,
              affectedDevices: [hDev.id],
            });
          }
        });
      }

      // 3. Pet Environmental Protection (AC / Heating shutoff with pets)
      if (rule.conditionType === 'pet_protection') {
        const pets = world.people.filter((p) => p.attributes.role === 'pet');
        const cutsClimate = plan.some(
          (s) => (s.deviceType === 'ac' || s.deviceId.includes('ac') || s.deviceId.includes('heater')) && s.targetState.power === 'off'
        );

        if (pets.length > 0 && cutsClimate) {
          const petNames = pets.map((p) => p.name).join(', ');
          findings.push({
            id: `risk_${rule.id}_pets`,
            ruleId: rule.id,
            severity: 'HIGH',
            title: `Pet Protection: Climate Cutoff for ${petNames}`,
            explanation: rule.explanation,
            evidence: `Plan turns off AC while pet (${petNames}) is present and unmonitored.`,
            suggestedFix: rule.suggestedFix,
            score: 3 * 0.85 * 0.7 * 1.0,
            affectedPeople: pets.map((p) => p.name),
          });
        }
      }

      // 4. Sleep-Hour Egress Lighting
      if (rule.conditionType === 'sleep_egress_lighting') {
        const isNight = world.timeOfDay < 6.0 || world.timeOfDay > 21.0;
        const anyoneSleeping = world.people.some((p) => p.activity === 'sleeping' || p.activity === 'resting');

        if (isNight || anyoneSleeping) {
          const cutsHallLight = plan.some(
            (s) => s.room === 'hall' && s.deviceType === 'light' && s.targetState.power === 'off'
          );

          if (cutsHallLight) {
            findings.push({
              id: `risk_${rule.id}_egress`,
              ruleId: rule.id,
              severity: 'MEDIUM',
              title: 'Sleep-Hour Egress Lighting Darkened',
              explanation: rule.explanation,
              evidence: `Plan turns off hallway egress lights at night (${world.timeOfDay.toFixed(1)}h) while occupants are resting.`,
              suggestedFix: rule.suggestedFix,
              score: 2 * 0.7 * 0.8 * 1.0,
            });
          }
        }
      }

      // 5. Garage / Gate Left Open While Away or Unattended
      if (rule.conditionType === 'perimeter_open') {
        const openPortals = world.devices.filter(
          (d) => (d.type === 'garage_door' || d.type === 'gate') && d.state.open === true
        );

        if (openPortals.length > 0) {
          const portalNames = openPortals.map((p) => p.name).join(', ');
          findings.push({
            id: `risk_${rule.id}_portal`,
            ruleId: rule.id,
            severity: 'MEDIUM',
            title: 'Vehicle Access Portal Left Open',
            explanation: rule.explanation,
            evidence: `${portalNames} is currently open, leaving perimeter compromised.`,
            suggestedFix: rule.suggestedFix,
            score: 2 * 0.7 * 0.5 * 1.0,
            affectedDevices: openPortals.map((d) => d.id),
          });
        }
      }

      // 6. Occupancy Conflict: Locking Interior Doors When People Are Inside Residence
      if (rule.conditionType === 'occupancy_conflict') {
        const locksInteriorDoor = plan.some((s) => {
          if (s.deviceType !== 'door_lock' || s.targetState.locked !== true) return false;
          const door = world.doors.find((d) => d.lockDeviceId === s.deviceId || d.id === s.deviceId);
          return door && door.fromRoom !== 'lawn' && door.toRoom !== 'lawn';
        });

        const indoorOccupants = world.people.filter((p) => p.currentRoom !== 'lawn');

        if (locksInteriorDoor && indoorOccupants.length > 0) {
          const names = indoorOccupants.map((p) => p.name).join(', ');
          findings.push({
            id: `risk_${rule.id}_interior_lock`,
            ruleId: rule.id,
            severity: 'HIGH',
            title: 'Interior Door Lock While Occupants Inside House',
            explanation: 'Locking interior room doors while occupants are inside creates entrapment and egress hazards.',
            evidence: `Occupants [${names}] are inside the residence while interior room doors are targeted for locking.`,
            suggestedFix: 'Retain perimeter locks only; leave interior room doors unlocked.',
            score: 3 * 0.8 * 0.8 * 1.0,
            affectedPeople: indoorOccupants.map((p) => p.name),
          });
        }
      }

      // 7. Vulnerable Occupant Light & Climate Comfort
      if (rule.conditionType === 'vulnerable_occupant') {
        world.people.forEach((person) => {
          if (person.attributes.vulnerability > 0.6) {
            const cutsLightInRoom = plan.some(
              (s) =>
                s.room === person.currentRoom &&
                s.deviceType === 'light' &&
                s.targetState.power === 'off'
            );

            if (cutsLightInRoom) {
              const score = 2 * 0.7 * person.attributes.vulnerability * 1.0;
              findings.push({
                id: `risk_${rule.id}_${person.id}`,
                ruleId: rule.id,
                severity: 'MEDIUM',
                title: `Comfort Impact for ${person.name} (${person.attributes.ageGroup})`,
                explanation: `Plan attempts to turn off lighting in ${person.currentRoom} while ${person.name} is resting there.`,
                evidence: `${person.name} is vulnerable (rating: ${person.attributes.vulnerability}) in room ${person.currentRoom}.`,
                suggestedFix: `Dim light to warm 20% nightlight instead of extinguishing.`,
                score,
                affectedPeople: [person.name],
              });
            }
          }
        });
      }

      // 8. Perimeter Exposure at Night
      if (rule.conditionType === 'perimeter_exposure') {
        const isNight = world.timeOfDay < 6.0 || world.timeOfDay > 21.0;
        if (isNight) {
          const unlockedPerimeter = world.doors.filter(
            (d) => (d.fromRoom === 'lawn' || d.toRoom === 'lawn') && !d.isLocked
          );

          if (unlockedPerimeter.length > 0) {
            const score = 2 * 0.6 * 0.5 * 1.0;
            findings.push({
              id: `risk_${rule.id}_night`,
              ruleId: rule.id,
              severity: 'MEDIUM',
              title: 'Perimeter Doors Unlocked at Night',
              explanation: rule.explanation,
              evidence: `${unlockedPerimeter.map((d) => d.name).join(', ')} remain unlocked at ${world.timeOfDay.toFixed(1)}:00.`,
              suggestedFix: rule.suggestedFix,
              score,
            });
          }
        }
      }
    }

    return findings;
  }
}
