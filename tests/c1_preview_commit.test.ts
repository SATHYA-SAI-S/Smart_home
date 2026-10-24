import { describe, it, expect, beforeEach } from 'vitest';
import { CommitGuard } from '../src/agent/CommitGuard';
import { INITIAL_DEVICES, INITIAL_DOORS, INITIAL_PEOPLE, INITIAL_ROOMS } from '../src/data/initialWorld';
import { PlanStep, Intent } from '../src/types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../src/types/world';

describe('C1: State-Aware Preview / Commit Tests', () => {
  let world: {
    devices: DeviceEntity[];
    doors: DoorEntity[];
    people: PersonEntity[];
    rooms: RoomZone[];
  };

  const sampleIntent: Intent = {
    goal: 'cool_down_bedroom',
    scope: 'bedroom',
    urgency: 'NORMAL',
    speaker: 'You',
    constraints: [],
    confidence: 1.0,
    ambiguities: [],
  };

  const samplePlan: PlanStep[] = [
    {
      id: 'step_bedroom_fan',
      deviceId: 'bedroom_fan',
      deviceName: 'Bedroom Fan',
      deviceType: 'fan',
      room: 'bedroom',
      action: 'turn_on',
      targetState: { power: 'on' },
      currentState: { power: 'off' },
      reason: 'Cooling requested',
      isEssential: false,
      approved: true,
    },
  ];

  beforeEach(() => {
    world = {
      devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
      doors: JSON.parse(JSON.stringify(INITIAL_DOORS)),
      people: JSON.parse(JSON.stringify(INITIAL_PEOPLE)),
      rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
    };
    CommitGuard.clearTokens();
  });

  it('Requirement C1: Preview leaves the live World Model deep-equal before and after', async () => {
    const worldBefore = JSON.parse(JSON.stringify(world));
    
    const previewResult = await CommitGuard.preview('turn off hall fan', world, 'You');

    expect(previewResult.plan).toBeDefined();
    expect(previewResult.token).toBeDefined();
    expect(previewResult.token.id).toBeTruthy();
    
    // Live world must remain 100% strictly identical
    expect(world).toEqual(worldBefore);
  });

  it('Requirement C1: Commit without token fails with INVALID_TOKEN', async () => {
    const executedSteps: PlanStep[] = [];
    const mockExecutor = async (p: PlanStep[]) => {
      executedSteps.push(...p);
      return { success: true, mismatches: [], executedSteps: p };
    };

    const res = await CommitGuard.commit(
      null,
      samplePlan,
      sampleIntent,
      [],
      [],
      world,
      'You',
      mockExecutor
    );

    expect(res.status).toBe('INVALID_TOKEN');
    expect(res.success).toBe(false);
    expect(executedSteps.length).toBe(0);
  });

  it('Requirement C1: Expired token fails with EXPIRED and produces 0 mutations', async () => {
    const token = CommitGuard.createToken(samplePlan, world, -1000); // Created 1 second in the past
    const executedSteps: PlanStep[] = [];
    const mockExecutor = async (p: PlanStep[]) => {
      executedSteps.push(...p);
      return { success: true, mismatches: [], executedSteps: p };
    };

    const res = await CommitGuard.commit(
      token,
      samplePlan,
      sampleIntent,
      [],
      [],
      world,
      'You',
      mockExecutor
    );

    expect(res.status).toBe('EXPIRED');
    expect(res.success).toBe(false);
    expect(executedSteps.length).toBe(0);
  });

  it('Requirement C1: Occupancy change in an affected room triggers DRIFTED with factual diff', async () => {
    const token = CommitGuard.createToken(samplePlan, world); // Plan affects 'bedroom'
    
    // Move resident into bedroom after preview
    const resident = world.people.find((p) => p.name === 'Grandpa');
    expect(resident).toBeDefined();
    resident!.currentRoom = 'bedroom';

    const executedSteps: PlanStep[] = [];
    const mockExecutor = async (p: PlanStep[]) => {
      executedSteps.push(...p);
      return { success: true, mismatches: [], executedSteps: p };
    };

    const res = await CommitGuard.commit(
      token,
      samplePlan,
      sampleIntent,
      [],
      [],
      world,
      'You',
      mockExecutor
    );

    expect(res.status).toBe('DRIFTED');
    expect(res.success).toBe(false);
    expect(executedSteps.length).toBe(0); // Nothing executed
    expect(res.driftDiff).toBeDefined();
    expect(res.driftDiff!.length).toBeGreaterThan(0);
    expect(res.driftDiff![0].explanation).toContain('Grandpa moved into bedroom');
    expect(res.newToken).toBeDefined(); // A fresh token is supplied for re-approval
  });

  it('Requirement C1: Unrelated change in an unaffected room DOES NOT cause false drift', async () => {
    const token = CommitGuard.createToken(samplePlan, world); // Plan touches ONLY 'bedroom' and 'bedroom_fan'

    // Mutate completely unrelated entity in lawn/garage
    const lawnLight = world.devices.find((d) => d.id === 'lawn_light');
    if (lawnLight) {
      lawnLight.state.power = 'on';
    }
    // Move resident in unrelated room (kitchen to hall)
    const kid = world.people.find((p) => p.name === 'Kid');
    if (kid) {
      kid.currentRoom = 'hall';
    }

    const executedSteps: PlanStep[] = [];
    const mockExecutor = async (p: PlanStep[]) => {
      executedSteps.push(...p);
      return { success: true, mismatches: [], executedSteps: p };
    };

    const res = await CommitGuard.commit(
      token,
      samplePlan,
      sampleIntent,
      [],
      [],
      world,
      'You',
      mockExecutor
    );

    expect(res.status).toBe('COMMITTED');
    expect(res.success).toBe(true);
    expect(executedSteps.length).toBe(1);
  });

  it('Requirement C1: Replay attack prevention — Token cannot be committed twice', async () => {
    const token = CommitGuard.createToken(samplePlan, world);

    const mockExecutor = async (p: PlanStep[]) => ({
      success: true,
      mismatches: [],
      executedSteps: p,
    });

    const firstCommit = await CommitGuard.commit(
      token,
      samplePlan,
      sampleIntent,
      [],
      [],
      world,
      'You',
      mockExecutor
    );
    expect(firstCommit.status).toBe('COMMITTED');

    // Attempt to commit same token again
    const replayCommit = await CommitGuard.commit(
      token,
      samplePlan,
      sampleIntent,
      [],
      [],
      world,
      'You',
      mockExecutor
    );
    expect(replayCommit.status).toBe('INVALID_TOKEN');
    expect(replayCommit.message).toContain('already been consumed');
  });

  it('Requirement C1: Plan tampering rejection — Modified steps fail commit', async () => {
    const token = CommitGuard.createToken(samplePlan, world);

    const tamperedPlan: PlanStep[] = [
      {
        ...samplePlan[0],
        targetState: { power: 'off' }, // Tampered target
      },
    ];

    const res = await CommitGuard.commit(
      token,
      tamperedPlan,
      sampleIntent,
      [],
      [],
      world,
      'You'
    );

    expect(res.status).toBe('INVALID_TOKEN');
    expect(res.message).toContain('tampered');
  });

  it('Requirement C1: Hard invariant re-check at actuation boundary blocks forbidden action', async () => {
    // Construct a plan that cuts refrigerator power
    const forbiddenPlan: PlanStep[] = [
      {
        id: 'cut_fridge',
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

    const token = CommitGuard.createToken(forbiddenPlan, world);

    const res = await CommitGuard.commit(
      token,
      forbiddenPlan,
      sampleIntent,
      [],
      [],
      world,
      'You'
    );

    expect(res.status).toBe('BLOCKED_INVARIANT');
    expect(res.success).toBe(false);
    expect(res.message).toContain('INVARIANT VIOLATION');
  });
});
