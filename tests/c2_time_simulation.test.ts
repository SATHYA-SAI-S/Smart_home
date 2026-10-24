import { describe, it, expect, beforeEach } from 'vitest';
import { TimeAwareSimulator } from '../src/agent/TimeAwareSimulator';
import { HazardConfig } from '../src/config/SentinelConfig';
import { INITIAL_DEVICES, INITIAL_DOORS, INITIAL_PEOPLE, INITIAL_ROOMS } from '../src/data/initialWorld';
import { PlanStep } from '../src/types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../src/types/world';

describe('C2: Time-Aware Simulation Tests', () => {
  let world: {
    devices: DeviceEntity[];
    doors: DoorEntity[];
    people: PersonEntity[];
    rooms: RoomZone[];
    timeOfDay: number;
  };

  beforeEach(() => {
    world = {
      devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
      doors: JSON.parse(JSON.stringify(INITIAL_DOORS)),
      people: JSON.parse(JSON.stringify(INITIAL_PEOPLE)),
      rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
      timeOfDay: 12.0, // Noon
    };
  });

  it('Requirement C2: Computed threshold-crossing time matches closed-form analytical physics solution', () => {
    const T_0 = 2.0;
    const T_target = HazardConfig.fridge.spoilageTempThresholdC; // 4.0°C
    const T_amb = HazardConfig.fridge.ambientTempC; // 24.0°C
    const k = HazardConfig.fridge.decayConstantPerHour; // 0.18

    // Analytical closed-form crossing time:
    const analyticalCrossingMinutes = TimeAwareSimulator.solveFridgeCrossingMinutes(T_0, T_target, T_amb, k);
    expect(analyticalCrossingMinutes).toBeGreaterThan(30);
    expect(analyticalCrossingMinutes).toBeLessThan(35);

    // Set controlled initial condition on fridge
    const fridge = world.devices.find((d) => d.id === 'kitchen_fridge');
    expect(fridge).toBeDefined();
    fridge!.state.temperature = T_0;
    fridge!.state.power = 'on';

    // Plan turns off fridge
    const cutFridgePlan: PlanStep[] = [
      {
        id: 'step_cut_fridge',
        deviceId: 'kitchen_fridge',
        deviceName: 'Kitchen Refrigerator',
        deviceType: 'refrigerator',
        room: 'kitchen',
        action: 'turn_off',
        targetState: { power: 'off' },
        currentState: { power: 'on' },
        reason: 'User command',
        isEssential: true,
        approved: true,
      },
    ];

    const result = TimeAwareSimulator.fastForward(world, cutFridgePlan, [5, 60, 480], 1);
    const fridgeCrossing = result.thresholdCrossings.find((c) => c.hazardType === 'fridge_spoilage');

    expect(fridgeCrossing).toBeDefined();
    expect(fridgeCrossing!.firstCrossingMinutes).not.toBeNull();
    
    // Discrete 1-minute tick simulation must match analytical solution within <= 1 minute!
    const diff = Math.abs(fridgeCrossing!.firstCrossingMinutes! - analyticalCrossingMinutes);
    expect(diff).toBeLessThanOrEqual(1.0);
  });

  it('Requirement C2: Flags time-only catches absent at t=0 but triggered at later checkpoints', () => {
    const fridge = world.devices.find((d) => d.id === 'kitchen_fridge');
    fridge!.state.temperature = 2.0;

    const cutFridgePlan: PlanStep[] = [
      {
        id: 'step_cut_fridge',
        deviceId: 'kitchen_fridge',
        deviceName: 'Kitchen Refrigerator',
        deviceType: 'refrigerator',
        room: 'kitchen',
        action: 'turn_off',
        targetState: { power: 'off' },
        currentState: { power: 'on' },
        reason: 'User command',
        isEssential: true,
        approved: true,
      },
    ];

    const result = TimeAwareSimulator.fastForward(world, cutFridgePlan, [5, 60, 480], 1);
    
    // At t=0 (Now), fridge is at 2.0°C (no spoilage finding)
    const t0 = result.checkpoints.find((c) => c.timeMinutes === 0);
    expect(t0).toBeDefined();
    expect(t0!.findings.some((f) => f.title.includes('Spoilage'))).toBe(false);

    // At t=60 (+1h), temperature crossed 4.0°C (spoilage finding active)
    const t60 = result.checkpoints.find((c) => c.timeMinutes === 60);
    expect(t60).toBeDefined();
    expect(t60!.findings.some((f) => f.title.includes('Spoilage'))).toBe(true);

    // timeOnlyCatches aggregate should flag the delayed catch
    expect(result.timeOnlyCatches.length).toBeGreaterThan(0);
    expect(result.timeOnlyCatches.some((h) => h.includes('Spoilage'))).toBe(true);
  });

  it('Requirement C2: Safe plan stays within limits at all checkpoints', () => {
    // Normal benign plan: dim living room lights
    const safePlan: PlanStep[] = [
      {
        id: 'step_dim_light',
        deviceId: 'hall_light_1',
        deviceName: 'Living Room Chandelier',
        deviceType: 'light',
        room: 'hall',
        action: 'dim',
        targetState: { level: 30 },
        currentState: { level: 100 },
        reason: 'Evening ambiance',
        isEssential: false,
        approved: true,
      },
    ];

    const result = TimeAwareSimulator.fastForward(world, safePlan, [5, 60, 480], 1);

    // Ensure fridge temperature remained safe throughout entire 8 hours
    const t480 = result.checkpoints.find((c) => c.timeMinutes === 480);
    expect(t480).toBeDefined();
    expect(t480!.environmentalValues.fridgeTempC).toBe(3); // Never drifted from initial 3.0°C
    expect(t480!.findings.some((f) => f.title.includes('Spoilage'))).toBe(false);
  });

  it('Requirement C2: FastForward never mutates the live World Model (World Isolation)', () => {
    const worldBefore = JSON.parse(JSON.stringify(world));

    const destructivePlan: PlanStep[] = [
      {
        id: 'step_destruct',
        deviceId: 'kitchen_fridge',
        deviceName: 'Kitchen Refrigerator',
        deviceType: 'refrigerator',
        room: 'kitchen',
        action: 'turn_off',
        targetState: { power: 'off', temperature: 30.0 },
        currentState: { power: 'on', temperature: 2.0 },
        reason: 'User command',
        isEssential: true,
        approved: true,
      },
    ];

    TimeAwareSimulator.fastForward(world, destructivePlan, [5, 60, 480], 1);

    // Live world must remain 100% untouched
    expect(world).toEqual(worldBefore);
  });

  it('Requirement C2: Computes stove unattended fire threshold crossing', () => {
    // Empty kitchen
    world.people.forEach((p) => {
      if (p.currentRoom === 'kitchen') p.currentRoom = 'hall';
    });

    const stoveOnPlan: PlanStep[] = [
      {
        id: 'step_stove_on',
        deviceId: 'kitchen_stove',
        deviceName: 'Kitchen Induction Cooktop',
        deviceType: 'stove',
        room: 'kitchen',
        action: 'turn_on',
        targetState: { power: 'on' },
        currentState: { power: 'off' },
        reason: 'Preheat',
        isEssential: false,
        approved: true,
      },
    ];

    const result = TimeAwareSimulator.fastForward(world, stoveOnPlan, [5, 60, 480], 1);
    const stoveCrossing = result.thresholdCrossings.find((c) => c.hazardType === 'stove_unattended_fire');

    expect(stoveCrossing).toBeDefined();
    expect(stoveCrossing!.firstCrossingMinutes).toBe(HazardConfig.stove.criticalUnattendedMinutes); // 10 minutes
  });

  it('Requirement C2: Computes medical battery depletion threshold crossing', () => {
    const cutMedPlan: PlanStep[] = [
      {
        id: 'step_cut_med',
        deviceId: 'bedroom_plug_medical',
        deviceName: 'Bedroom Medical Plug',
        deviceType: 'smart_plug',
        room: 'bedroom',
        action: 'turn_off',
        targetState: { power: 'off' },
        currentState: { power: 'on' },
        reason: 'Save energy',
        isEssential: true,
        approved: true,
      },
    ];

    const result = TimeAwareSimulator.fastForward(world, cutMedPlan, [5, 60, 480], 1);
    const medCrossing = result.thresholdCrossings.find((c) => c.hazardType === 'medical_battery_depletion');

    expect(medCrossing).toBeDefined();
    expect(medCrossing!.firstCrossingMinutes).toBe(HazardConfig.medical.batteryReserveMinutes); // 30 minutes
  });
});
