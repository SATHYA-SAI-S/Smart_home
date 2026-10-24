import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/agent/PolicyEngine';
import { INITIAL_DEVICES, INITIAL_DOORS, INITIAL_PEOPLE, INITIAL_ROOMS } from '../src/data/initialWorld';
import { PlanStep } from '../src/types/agent';

describe('Hard Invariants Tests', () => {
  const worldState = {
    devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
    doors: JSON.parse(JSON.stringify(INITIAL_DOORS)),
    people: JSON.parse(JSON.stringify(INITIAL_PEOPLE)),
    rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
  };

  it('Hard Invariant 1: Blocks power cut to Refrigerator (ESSENTIAL)', () => {
    const fridgeStep: PlanStep = {
      id: 'step_fridge_cut',
      deviceId: 'kitchen_fridge',
      deviceName: 'Kitchen Smart Refrigerator',
      deviceType: 'refrigerator',
      room: 'kitchen',
      action: 'turn_off',
      targetState: { power: 'off' },
      currentState: { power: 'on' },
      reason: 'Requested by user',
      isEssential: true,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([fridgeStep], worldState);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].approved).toBe(false);
    expect(safePlan[0].invariantViolationMessage).toContain('ESSENTIAL');
  });

  it('Hard Invariant 1: Blocks power cut to Main Electrical Switch (ESSENTIAL)', () => {
    const breakerStep: PlanStep = {
      id: 'step_breaker_cut',
      deviceId: 'main_switch',
      deviceName: 'Main Electrical Breaker Switch',
      deviceType: 'main_switch',
      room: 'garage',
      action: 'turn_off',
      targetState: { power: 'off' },
      currentState: { power: 'on' },
      reason: 'User command',
      isEssential: true,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([breakerStep], worldState);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].approved).toBe(false);
  });

  it('Hard Invariant 1: Blocks power cut to Bedroom Medical Plug (ESSENTIAL)', () => {
    const medicalStep: PlanStep = {
      id: 'step_med_cut',
      deviceId: 'bedroom_plug_medical',
      deviceName: 'Bedroom Vital Monitor Plug',
      deviceType: 'smart_plug',
      room: 'bedroom',
      action: 'turn_off',
      targetState: { power: 'off' },
      currentState: { power: 'on' },
      reason: 'User command',
      isEssential: true,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([medicalStep], worldState);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].approved).toBe(false);
  });

  it('Hard Invariant 2: Blocks locking Bathroom door when someone is inside', () => {
    // Put Grandpa in bathroom
    const modifiedWorld = JSON.parse(JSON.stringify(worldState));
    const grandpa = modifiedWorld.people.find((p: any) => p.name === 'Grandpa');
    grandpa.currentRoom = 'bathroom';

    const lockBathroomStep: PlanStep = {
      id: 'step_lock_bath',
      deviceId: 'bathroom_door_lock',
      deviceName: 'Bathroom Door Smart Lock',
      deviceType: 'door_lock',
      room: 'bathroom',
      action: 'lock',
      targetState: { locked: true },
      currentState: { locked: false },
      reason: 'Secure perimeter',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([lockBathroomStep], modifiedWorld);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].invariantViolationMessage).toContain('Grandpa');
    expect(safePlan[0].invariantViolationMessage).toContain('bathroom');
  });

  it('Hard Invariant 3: Blocks locking an open door', () => {
    // Set front door to open
    const modifiedWorld = JSON.parse(JSON.stringify(worldState));
    const mainDoor = modifiedWorld.doors.find((d: any) => d.id === 'door_main');
    mainDoor.isOpen = true;

    const lockMainDoorStep: PlanStep = {
      id: 'step_lock_main',
      deviceId: 'main_door_lock',
      deviceName: 'Front Entrance Smart Lock',
      deviceType: 'door_lock',
      room: 'hall',
      action: 'lock',
      targetState: { locked: true },
      currentState: { locked: false },
      reason: 'Secure main entrance',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([lockMainDoorStep], modifiedWorld);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].invariantViolationMessage).toContain('currently open');
  });

  it('Rule 1 Invariant: Blocks disabling or muting smoke/CO detectors and siren', () => {
    const muteSmokeStep: PlanStep = {
      id: 'step_mute_smoke',
      deviceId: 'smoke_detector',
      deviceName: 'Hallway Smoke & Fire Detector',
      deviceType: 'safety_sensor',
      room: 'hall',
      action: 'turn_off',
      targetState: { power: 'off' },
      currentState: { power: 'on' },
      reason: 'User command to silence sensor',
      isEssential: true,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([muteSmokeStep], worldState);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].invariantViolationMessage).toContain('Never disable or mute safety detectors');
  });

  it('Rule 3 Invariant: Blocks gas valve activation / ignition with no occupant present in kitchen', () => {
    // Occupants are in hall and lawn
    const openGasStep: PlanStep = {
      id: 'step_open_gas',
      deviceId: 'gas_safety_valve',
      deviceName: 'Kitchen Automated Gas Safety Valve',
      deviceType: 'gas_valve',
      room: 'kitchen',
      action: 'turn_on',
      targetState: { power: 'on' },
      currentState: { power: 'off' },
      reason: 'Open gas line',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([openGasStep], worldState);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].invariantViolationMessage).toContain('no occupant present in kitchen');
  });

  it('Rule 4 Invariant: Blocks locking doors or closing gates during active fire/CO alarm', () => {
    const alarmWorld = JSON.parse(JSON.stringify(worldState));
    const smoke = alarmWorld.devices.find((d: any) => d.id === 'smoke_detector');
    smoke.state.alarmActive = true;

    const lockDoorStep: PlanStep = {
      id: 'step_lock_egress',
      deviceId: 'bedroom_door_lock',
      deviceName: 'Bedroom Door Lock',
      deviceType: 'door_lock',
      room: 'bedroom',
      action: 'lock',
      targetState: { locked: true },
      currentState: { locked: false },
      reason: 'Lock during fire',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([lockDoorStep], alarmWorld);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].invariantViolationMessage).toContain('Emergency egress active');
  });

  it('Rule 8 Invariant: Blocks activating cameras in private zones (bedroom/bathroom)', () => {
    const cameraInBedroomStep: PlanStep = {
      id: 'step_cam_bed',
      deviceId: 'bedroom_camera',
      deviceName: 'Bedroom Nanny Cam',
      deviceType: 'camera',
      room: 'bedroom',
      action: 'turn_on',
      targetState: { power: 'on', recording: true },
      currentState: { power: 'off' },
      reason: 'Activate bedroom feed',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([cameraInBedroomStep], worldState);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].invariantViolationMessage).toContain('strictly prohibited in private room "bedroom"');
  });

  it('Hard Invariant 4: Blocks turning on pool filter when someone is inside the swimming pool', () => {
    const modifiedWorld = JSON.parse(JSON.stringify(worldState));
    // Put "You" in the swimming pool
    const userPerson = modifiedWorld.people.find((p: any) => p.name === 'You');
    userPerson.currentRoom = 'pool';
    userPerson.position = [11.0, -0.4, 13.5];

    const turnOnFilterStep: PlanStep = {
      id: 'step_pool_filter_on',
      deviceId: 'pool_filter',
      deviceName: 'Swimming Pool Filter Switch',
      deviceType: 'pool_filter',
      room: 'pool',
      action: 'turn_on',
      targetState: { power: 'on', filtering: true },
      currentState: { power: 'off', filtering: false },
      reason: 'User command',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([turnOnFilterStep], modifiedWorld);
    expect(violations.length).toBe(1);
    expect(safePlan[0].isBlockedByInvariant).toBe(true);
    expect(safePlan[0].approved).toBe(false);
    expect(safePlan[0].invariantViolationMessage).toContain('swimming pool');
    expect(safePlan[0].invariantViolationMessage).toContain('You');
  });

  it('Hard Invariant 4: Allows turning on pool filter when swimming pool is empty', () => {
    const modifiedWorld = JSON.parse(JSON.stringify(worldState));
    // Ensure all people are outside the pool
    modifiedWorld.people.forEach((p: any) => {
      if (p.currentRoom === 'pool') p.currentRoom = 'hall';
    });

    const turnOnFilterStep: PlanStep = {
      id: 'step_pool_filter_on',
      deviceId: 'pool_filter',
      deviceName: 'Swimming Pool Filter Switch',
      deviceType: 'pool_filter',
      room: 'pool',
      action: 'turn_on',
      targetState: { power: 'on', filtering: true },
      currentState: { power: 'off', filtering: false },
      reason: 'User command',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([turnOnFilterStep], modifiedWorld);
    expect(violations.length).toBe(0);
    expect(safePlan[0].isBlockedByInvariant).toBe(false);
    expect(safePlan[0].approved).toBe(true);
  });

  it('Hard Invariant 4: Allows turning off pool filter even if someone is in the pool', () => {
    const modifiedWorld = JSON.parse(JSON.stringify(worldState));
    const userPerson = modifiedWorld.people.find((p: any) => p.name === 'You');
    userPerson.currentRoom = 'pool';
    userPerson.position = [11.0, -0.4, 13.5];

    const turnOffFilterStep: PlanStep = {
      id: 'step_pool_filter_off',
      deviceId: 'pool_filter',
      deviceName: 'Swimming Pool Filter Switch',
      deviceType: 'pool_filter',
      room: 'pool',
      action: 'turn_off',
      targetState: { power: 'off', filtering: false },
      currentState: { power: 'on', filtering: true },
      reason: 'User command',
      isEssential: false,
      approved: true,
    };

    const { safePlan, violations } = PolicyEngine.evaluateInvariants([turnOffFilterStep], modifiedWorld);
    expect(violations.length).toBe(0);
    expect(safePlan[0].isBlockedByInvariant).toBe(false);
    expect(safePlan[0].approved).toBe(true);
  });
});
