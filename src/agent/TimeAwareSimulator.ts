import { 
  PlanStep, 
  RiskFinding, 
  TimelineCheckpoint, 
  ThresholdCrossing, 
  TimeSimulationResult 
} from '../types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../types/world';
import { SimulationConfig, HazardConfig } from '../config/SentinelConfig';
import { PolicyEngine } from './PolicyEngine';
import { useAgentStore } from '../store/useAgentStore';

export class TimeAwareSimulator {
  /**
   * Advances the cloned sandbox world forward in time across discrete checkpoints.
   * Computes state dynamics, real threshold-crossing times, and detects time-only catches.
   * NEVER mutates the live World Model.
   */
  static fastForward(
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[]; rooms: RoomZone[]; timeOfDay?: number },
    plan: PlanStep[],
    checkpointsMinutes: number[] = SimulationConfig.checkpointsMinutes,
    tickIntervalMinutes: number = SimulationConfig.tickIntervalMinutes
  ): TimeSimulationResult {
    // 1. Deep clone sandbox state to maintain absolute live world isolation
    const clonedDevices: DeviceEntity[] = JSON.parse(JSON.stringify(world.devices));
    const clonedDoors: DoorEntity[] = JSON.parse(JSON.stringify(world.doors));
    const clonedPeople: PersonEntity[] = JSON.parse(JSON.stringify(world.people));
    const rooms = world.rooms;
    let baseTimeOfDay = world.timeOfDay ?? 12.0;

    // 2. Apply plan steps to the cloned sandbox at t = 0
    for (const step of plan) {
      if (step.isBlockedByInvariant) continue;
      const dev = clonedDevices.find((d) => d.id === step.deviceId);
      if (dev) {
        Object.assign(dev.state, step.targetState);
      }
      const door = clonedDoors.find((d) => d.lockDeviceId === step.deviceId || d.id === step.deviceId);
      if (door) {
        if (step.targetState.locked !== undefined) door.isLocked = step.targetState.locked;
        if (step.targetState.open !== undefined) door.isOpen = step.targetState.open;
      }
    }

    // 3. Read initial physical environment values directly from sandbox state
    const fridgeDev = clonedDevices.find((d) => d.type === 'refrigerator' || d.id.includes('fridge'));
    let currentFridgeTemp = typeof fridgeDev?.state.temperature === 'number' 
      ? fridgeDev.state.temperature 
      : 2.0; // Standard initial food storage temp in Celsius

    const stoveDev = clonedDevices.find((d) => d.type === 'stove' || d.id.includes('stove'));
    let stoveUnattendedMinutes = 0;

    const medicalPlug = clonedDevices.find((d) => d.id.includes('medical') || d.id === 'bedroom_plug_medical');
    let medicalBatteryPercent = 100.0;

    const roomTemps: Record<string, number> = {};
    for (const r of rooms) {
      roomTemps[r.id] = 22.0; // Baseline indoor climate in Celsius
    }

    // Track computed crossing times
    const crossings: ThresholdCrossing[] = [
      {
        hazardType: 'fridge_spoilage',
        thresholdName: `Food Spoilage (> ${HazardConfig.fridge.spoilageTempThresholdC}°C)`,
        firstCrossingMinutes: null,
        details: '',
        mitigationAvailable: true,
      },
      {
        hazardType: 'fridge_bacterial_danger',
        thresholdName: `Bacterial Hazard (> ${HazardConfig.fridge.dangerTempThresholdC}°C)`,
        firstCrossingMinutes: null,
        details: '',
        mitigationAvailable: true,
      },
      {
        hazardType: 'stove_unattended_fire',
        thresholdName: `Unattended Fire Risk (>= ${HazardConfig.stove.criticalUnattendedMinutes} min)`,
        firstCrossingMinutes: null,
        details: '',
        mitigationAvailable: true,
      },
      {
        hazardType: 'heat_stress_vulnerable',
        thresholdName: `Heat Stress (> ${HazardConfig.climate.vulnerableHeatStressThresholdC}°C with vulnerable resident)`,
        firstCrossingMinutes: null,
        details: '',
        mitigationAvailable: true,
      },
      {
        hazardType: 'medical_battery_depletion',
        thresholdName: `Medical Life-Support Battery Depletion (<= 0%)`,
        firstCrossingMinutes: null,
        details: '',
        mitigationAvailable: false,
      },
      {
        hazardType: 'pool_filtration_swimmer',
        thresholdName: `Pool Suction/Electrical Risk while Occupied`,
        firstCrossingMinutes: null,
        details: '',
        mitigationAvailable: true,
      },
      {
        hazardType: 'perimeter_night_exposure',
        thresholdName: `Perimeter Exposure During Night Hours`,
        firstCrossingMinutes: null,
        details: '',
        mitigationAvailable: true,
      },
    ];

    // Sorted checkpoints starting with t=0
    const sortedCheckpoints = Array.from(new Set([0, ...checkpointsMinutes])).sort((a, b) => a - b);
    const maxSimMinutes = Math.max(...sortedCheckpoints);
    const timelineCheckpoints: TimelineCheckpoint[] = [];

    // Helper: evaluate rules on current cloned sandbox state
    const rules = useAgentStore.getState().rules;
    const evaluateCurrentState = (currentTimeOfDay: number): RiskFinding[] => {
      return PolicyEngine.evaluateSoftRisks(plan, [], rules, {
        devices: clonedDevices,
        doors: clonedDoors,
        people: clonedPeople,
        timeOfDay: currentTimeOfDay,
      });
    };

    // Baseline findings at t = 0
    let baselineFindingIds = new Set<string>();

    // 4. Run time-step simulation tick by tick (1 min resolution)
    for (let t = 0; t <= maxSimMinutes; t += tickIntervalMinutes) {
      const currentTimeOfDay = (baseTimeOfDay + t / 60) % 24;

      if (t > 0) {
        // Dynamics A: Refrigerator Thermal Drift
        // Newton's law of cooling: dT/dt = k * (T_ambient - T)
        if (fridgeDev?.state.power === 'off') {
          const k = HazardConfig.fridge.decayConstantPerHour;
          const T_amb = HazardConfig.fridge.ambientTempC;
          const deltaHours = tickIntervalMinutes / 60;
          currentFridgeTemp += k * (T_amb - currentFridgeTemp) * deltaHours;
          fridgeDev.state.temperature = parseFloat(currentFridgeTemp.toFixed(2));

          // Spoilage crossing check
          const spoilageCrossing = crossings.find((c) => c.hazardType === 'fridge_spoilage');
          if (spoilageCrossing && spoilageCrossing.firstCrossingMinutes === null) {
            if (currentFridgeTemp >= HazardConfig.fridge.spoilageTempThresholdC) {
              spoilageCrossing.firstCrossingMinutes = t;
              spoilageCrossing.details = `Reached ${currentFridgeTemp.toFixed(1)}°C at t=${t}m (spoilage limit ${HazardConfig.fridge.spoilageTempThresholdC}°C).`;
            }
          }

          // Danger crossing check
          const dangerCrossing = crossings.find((c) => c.hazardType === 'fridge_bacterial_danger');
          if (dangerCrossing && dangerCrossing.firstCrossingMinutes === null) {
            if (currentFridgeTemp >= HazardConfig.fridge.dangerTempThresholdC) {
              dangerCrossing.firstCrossingMinutes = t;
              dangerCrossing.details = `Reached dangerous ${currentFridgeTemp.toFixed(1)}°C at t=${t}m. High bacterial proliferation.`;
            }
          }
        }

        // Dynamics B: Stove Unattended in Empty Kitchen
        const kitchenOccupants = clonedPeople.filter((p) => p.currentRoom === 'kitchen');
        if (stoveDev?.state.power === 'on' && kitchenOccupants.length === 0) {
          stoveUnattendedMinutes += tickIntervalMinutes;
          const stoveCrossing = crossings.find((c) => c.hazardType === 'stove_unattended_fire');
          if (stoveCrossing && stoveCrossing.firstCrossingMinutes === null) {
            if (stoveUnattendedMinutes >= HazardConfig.stove.criticalUnattendedMinutes) {
              stoveCrossing.firstCrossingMinutes = t;
              stoveCrossing.details = `Burners energizing unattended for ${stoveUnattendedMinutes} minutes with 0 kitchen occupants.`;
            }
          }
        } else {
          stoveUnattendedMinutes = 0;
        }

        // Dynamics C: Room Climate Drift (AC Off with vulnerable occupants)
        for (const room of rooms) {
          const ac = clonedDevices.find((d) => d.type === 'ac' && d.room === room.id);
          const hasVulnerable = clonedPeople.some(
            (p) => p.currentRoom === room.id && p.attributes.vulnerability >= 0.7
          );

          if (ac?.state.power === 'off') {
            const driftPerHour = HazardConfig.climate.driftRatePerHour;
            const outdoor = HazardConfig.climate.ambientOutdoorTempC;
            const deltaHours = tickIntervalMinutes / 60;
            if (roomTemps[room.id] < outdoor) {
              roomTemps[room.id] += driftPerHour * deltaHours;
            }

            if (hasVulnerable) {
              const heatStressCrossing = crossings.find((c) => c.hazardType === 'heat_stress_vulnerable');
              if (heatStressCrossing && heatStressCrossing.firstCrossingMinutes === null) {
                if (roomTemps[room.id] >= HazardConfig.climate.vulnerableHeatStressThresholdC) {
                  heatStressCrossing.firstCrossingMinutes = t;
                  heatStressCrossing.details = `Room "${room.name}" reached ${roomTemps[room.id].toFixed(1)}°C with vulnerable occupant present.`;
                }
              }
            }
          }
        }

        // Dynamics D: Medical Monitor Battery Depletion
        if (medicalPlug?.state.power === 'off') {
          const depletionRatePerMinute = 100.0 / HazardConfig.medical.batteryReserveMinutes;
          medicalBatteryPercent = Math.max(0, medicalBatteryPercent - depletionRatePerMinute * tickIntervalMinutes);
          const medCrossing = crossings.find((c) => c.hazardType === 'medical_battery_depletion');
          if (medCrossing && medCrossing.firstCrossingMinutes === null && medicalBatteryPercent <= 0.001) {
            medCrossing.firstCrossingMinutes = t;
            medCrossing.details = `Reserve battery exhausted at t=${t}m. Vital patient telemetry lost.`;
          }
        }
      }

      // Dynamics E: Pool Pump Active with Swimmer Present
      const poolOccupants = clonedPeople.filter((p) => p.currentRoom === 'swimming_pool');
      const poolFilter = clonedDevices.find((d) => d.type === 'pool_filter');
      if (poolFilter?.state.power === 'on' && poolOccupants.length > 0) {
        const poolCrossing = crossings.find((c) => c.hazardType === 'pool_filtration_swimmer');
        if (poolCrossing && poolCrossing.firstCrossingMinutes === null) {
          poolCrossing.firstCrossingMinutes = t;
          poolCrossing.details = `Pool filter suction active while swimmer (${poolOccupants.map((p) => p.name).join(', ')}) is in pool.`;
        }
      }

      // Dynamics F: Perimeter Night Exposure
      const isNight =
        currentTimeOfDay >= HazardConfig.perimeter.nightStartHour ||
        currentTimeOfDay < HazardConfig.perimeter.nightEndHour;
      const perimeterOpen = clonedDoors.some(
        (d) => (d.fromRoom === 'lawn' || d.toRoom === 'lawn' || d.id.includes('garage') || d.id.includes('gate')) && (d.isOpen || !d.isLocked)
      );
      if (isNight && perimeterOpen) {
        const perimCrossing = crossings.find((c) => c.hazardType === 'perimeter_night_exposure');
        if (perimCrossing && perimCrossing.firstCrossingMinutes === null) {
          perimCrossing.firstCrossingMinutes = t;
          perimCrossing.details = `Exterior gates or garage left unlocked/open during nocturnal hours (${currentTimeOfDay.toFixed(1)}h).`;
        }
      }

      // Checkpoint capture
      if (sortedCheckpoints.includes(t)) {
        const findings = evaluateCurrentState(currentTimeOfDay);

        // Inject dynamic time-derived findings into findings list if thresholds crossed
        if (currentFridgeTemp >= HazardConfig.fridge.spoilageTempThresholdC && fridgeDev?.state.power === 'off') {
          findings.push({
            id: `time_hazard_fridge_${t}`,
            ruleId: 'rule_time_fridge_spoilage',
            severity: currentFridgeTemp >= HazardConfig.fridge.dangerTempThresholdC ? 'CRITICAL' : 'HIGH',
            title: `Perishable Food Spoilage (${currentFridgeTemp.toFixed(1)}°C)`,
            explanation: `Refrigerator temperature exceeded safe storage limits after ${t} minutes without power.`,
            evidence: `Computed temperature: ${currentFridgeTemp.toFixed(1)}°C (Safe limit: ${HazardConfig.fridge.spoilageTempThresholdC}°C).`,
            suggestedFix: 'Restore power to refrigerator immediately.',
            affectedDevices: [fridgeDev.id],
            score: 3.5,
          });
        }

        if (stoveUnattendedMinutes >= HazardConfig.stove.criticalUnattendedMinutes) {
          findings.push({
            id: `time_hazard_stove_${t}`,
            ruleId: 'rule_time_stove_fire',
            severity: 'CRITICAL',
            title: 'Critical Unattended Stove Fire Threat',
            explanation: `Cooktop has been actively energized for ${stoveUnattendedMinutes} minutes with zero kitchen occupants.`,
            evidence: `Elapsed unattended cooking duration: ${stoveUnattendedMinutes} min.`,
            suggestedFix: 'De-energize stove or confirm kitchen occupancy.',
            affectedDevices: [stoveDev?.id || 'kitchen_stove'],
            score: 4.5,
          });
        }

        if (t === 0) {
          baselineFindingIds = new Set(findings.map((f) => f.title));
        }

        const timeOnlyHazards = findings
          .filter((f) => !baselineFindingIds.has(f.title))
          .map((f) => f.title);

        let label = `Now (${t}m)`;
        if (t === 5) label = '+5m';
        else if (t === 60) label = '+1h';
        else if (t === 480) label = '+8h';
        else if (t > 0) label = `+${t}m`;

        timelineCheckpoints.push({
          timeMinutes: t,
          label,
          simulatedDevices: JSON.parse(JSON.stringify(clonedDevices)),
          simulatedDoors: JSON.parse(JSON.stringify(clonedDoors)),
          findings,
          environmentalValues: {
            fridgeTempC: parseFloat(currentFridgeTemp.toFixed(2)),
            roomTempsC: { ...roomTemps },
            stoveUnattendedMinutes,
            medicalBatteryPercent: Math.round(medicalBatteryPercent),
          },
          timeOnlyHazards,
        });
      }
    }

    // Identify aggregate time-only catches across all future checkpoints
    const allFutureTimeOnly = Array.from(
      new Set(
        timelineCheckpoints
          .filter((cp) => cp.timeMinutes > 0)
          .flatMap((cp) => cp.timeOnlyHazards)
      )
    );

    return {
      checkpoints: timelineCheckpoints,
      thresholdCrossings: crossings.filter((c) => c.firstCrossingMinutes !== null),
      timeOnlyCatches: allFutureTimeOnly,
    };
  }

  /**
   * Closed-form analytical solver for refrigerator thermal rise.
   * Solves: T(t) = T_amb - (T_amb - T_0) * exp(-k * t/60)
   * Inverse: t = (60 / k) * ln((T_amb - T_0) / (T_amb - T_target))
   */
  static solveFridgeCrossingMinutes(
    T_0: number,
    T_target: number,
    T_ambient: number = HazardConfig.fridge.ambientTempC,
    k: number = HazardConfig.fridge.decayConstantPerHour
  ): number {
    if (T_0 >= T_target) return 0;
    if (T_target >= T_ambient) return Infinity;
    const ratio = (T_ambient - T_0) / (T_ambient - T_target);
    return (60 / k) * Math.log(ratio);
  }
}
