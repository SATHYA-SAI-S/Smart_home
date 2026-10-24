import { 
  PlanStep, 
  PreviewToken, 
  CommitResult, 
  StateDriftDiff, 
  Intent, 
  RiskFinding, 
  SimulationDiffItem,
  PreviewResult
} from '../types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../types/world';
import { TokenConfig } from '../config/SentinelConfig';
import { PolicyEngine } from './PolicyEngine';
import { Executor } from './Executor';
import { Interpreter } from './Interpreter';
import { Planner } from './Planner';
import { Simulator } from './Simulator';
import { Recommender } from './Recommender';
import { useAgentStore } from '../store/useAgentStore';

/**
 * Deterministic fast string hash (djb2 / fnv1a mix)
 */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export interface RelevantWorldState {
  deviceStates: Record<string, any>;
  roomOccupancy: Record<string, string[]>;
  doorStates: Record<string, { isOpen: boolean; isLocked: boolean }>;
}

export class CommitGuard {
  // Server/Runtime Token Store to prevent replay and authenticate issued tokens
  private static issuedTokens: Map<string, { token: PreviewToken; consumed: boolean; rawState: RelevantWorldState }> = new Map();

  /**
   * Resets active token registry (useful in test suites)
   */
  static clearTokens(): void {
    this.issuedTokens.clear();
  }

  /**
   * Deterministically hashes the plan steps
   */
  static computePlanHash(plan: PlanStep[]): string {
    const canonical = plan.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      action: s.action,
      targetState: s.targetState,
      approved: s.approved,
      isBlocked: s.isBlockedByInvariant,
    }));
    return hashString(JSON.stringify(canonical));
  }

  /**
   * Extracts ONLY the state relevant to the given plan:
   * - Occupancy of affected rooms
   * - States of devices touched by the plan
   * - States of doors connecting affected rooms or controlled by affected devices
   *
   * Unrelated rooms, unrelated devices, or occupants in other rooms DO NOT affect this hash.
   */
  static extractRelevantState(
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[]; rooms?: RoomZone[] },
    relevantDeviceIds: string[],
    relevantRooms: string[]
  ): RelevantWorldState {
    const roomSet = new Set(relevantRooms);
    const devSet = new Set(relevantDeviceIds);

    // 1. Device states for devices directly touched by the plan
    const deviceStates: Record<string, any> = {};
    for (const d of world.devices) {
      if (devSet.has(d.id)) {
        // Deep copy clean state
        deviceStates[d.id] = JSON.parse(JSON.stringify(d.state));
      }
    }

    // 2. Room occupancy for rooms affected by the plan
    const roomOccupancy: Record<string, string[]> = {};
    for (const r of relevantRooms) {
      roomOccupancy[r] = world.people
        .filter((p) => p.currentRoom === r)
        .map((p) => p.name)
        .sort();
    }

    // 3. Doors associated with affected rooms or affected devices
    const doorStates: Record<string, { isOpen: boolean; isLocked: boolean }> = {};
    for (const d of world.doors) {
      const touchesRoom = roomSet.has(d.fromRoom) || roomSet.has(d.toRoom);
      const touchesDevice = d.lockDeviceId && devSet.has(d.lockDeviceId);
      if (touchesRoom || touchesDevice) {
        doorStates[d.id] = { isOpen: d.isOpen, isLocked: d.isLocked };
      }
    }

    return {
      deviceStates,
      roomOccupancy,
      doorStates,
    };
  }

  /**
   * Deterministically hashes the extracted relevant state
   */
  static computeStateHash(relevantState: RelevantWorldState): string {
    const keysSorted = {
      deviceStates: Object.keys(relevantState.deviceStates).sort().reduce((acc, k) => {
        acc[k] = relevantState.deviceStates[k];
        return acc;
      }, {} as Record<string, any>),
      roomOccupancy: Object.keys(relevantState.roomOccupancy).sort().reduce((acc, k) => {
        acc[k] = relevantState.roomOccupancy[k];
        return acc;
      }, {} as Record<string, string[]>),
      doorStates: Object.keys(relevantState.doorStates).sort().reduce((acc, k) => {
        acc[k] = relevantState.doorStates[k];
        return acc;
      }, {} as Record<string, any>),
    };
    return hashString(JSON.stringify(keysSorted));
  }

  /**
   * Computes the exact, structured differences between preview state and current state.
   * Generates factual, human-readable explanations — never fixed strings.
   */
  static computeStateDiff(
    previewState: RelevantWorldState,
    currentState: RelevantWorldState,
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[] }
  ): StateDriftDiff[] {
    const diffs: StateDriftDiff[] = [];

    // 1. Check room occupancy drifts
    for (const [room, prevPeople] of Object.entries(previewState.roomOccupancy)) {
      const currPeople = currentState.roomOccupancy[room] || [];
      const entered = currPeople.filter((p) => !prevPeople.includes(p));
      const left = prevPeople.filter((p) => !currPeople.includes(p));

      for (const p of entered) {
        diffs.push({
          entityType: 'room_occupancy',
          entityId: room,
          entityName: `Room: ${room}`,
          property: 'occupancy',
          previewValue: prevPeople,
          currentValue: currPeople,
          explanation: `${p} moved into ${room} after the preview was generated.`,
        });
      }

      for (const p of left) {
        diffs.push({
          entityType: 'room_occupancy',
          entityId: room,
          entityName: `Room: ${room}`,
          property: 'occupancy',
          previewValue: prevPeople,
          currentValue: currPeople,
          explanation: `${p} exited ${room} after the preview was generated.`,
        });
      }
    }

    // 2. Check device state drifts
    for (const [devId, prevState] of Object.entries(previewState.deviceStates)) {
      const currDev = world.devices.find((d) => d.id === devId);
      const currState = currentState.deviceStates[devId] || {};

      for (const [key, prevVal] of Object.entries(prevState)) {
        const currVal = currState[key];
        if (prevVal !== currVal) {
          diffs.push({
            entityType: 'device_state',
            entityId: devId,
            entityName: currDev?.name || devId,
            property: key,
            previewValue: prevVal,
            currentValue: currVal,
            explanation: `${currDev?.name || devId} changed property "${key}" from ${prevVal} to ${currVal}.`,
          });
        }
      }
    }

    // 3. Check door state drifts
    for (const [doorId, prevDoor] of Object.entries(previewState.doorStates)) {
      const currDoor = currentState.doorStates[doorId];
      const doorObj = world.doors.find((d) => d.id === doorId);
      const doorName = doorObj?.name || doorId;

      if (currDoor) {
        if (prevDoor.isOpen !== currDoor.isOpen) {
          diffs.push({
            entityType: 'door_state',
            entityId: doorId,
            entityName: doorName,
            property: 'isOpen',
            previewValue: prevDoor.isOpen,
            currentValue: currDoor.isOpen,
            explanation: `${doorName} physical position changed from ${prevDoor.isOpen ? 'open' : 'closed'} to ${currDoor.isOpen ? 'open' : 'closed'}.`,
          });
        }
        if (prevDoor.isLocked !== currDoor.isLocked) {
          diffs.push({
            entityType: 'door_state',
            entityId: doorId,
            entityName: doorName,
            property: 'isLocked',
            previewValue: prevDoor.isLocked,
            currentValue: currDoor.isLocked,
            explanation: `${doorName} lock changed from ${prevDoor.isLocked ? 'locked' : 'unlocked'} to ${currDoor.isLocked ? 'locked' : 'unlocked'}.`,
          });
        }
      }
    }

    return diffs;
  }

  /**
   * Generates a read-only PreviewToken without modifying the live world.
   */
  static createToken(
    plan: PlanStep[],
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[]; rooms?: RoomZone[] },
    lifetimeMs: number = TokenConfig.lifetimeMs
  ): PreviewToken {
    const relevantDeviceIds = Array.from(new Set(plan.map((s) => s.deviceId)));
    const relevantRooms = Array.from(
      new Set(
        plan
          .map((s) => s.room)
          .concat(
            world.devices
              .filter((d) => relevantDeviceIds.includes(d.id))
              .map((d) => d.room)
          )
          .filter(Boolean)
      )
    );

    const relevantState = this.extractRelevantState(world, relevantDeviceIds, relevantRooms);
    const planHash = this.computePlanHash(plan);
    const stateHash = this.computeStateHash(relevantState);
    const now = Date.now();

    const tokenId = `token_${now}_${Math.random().toString(36).substring(2, 9)}`;
    const token: PreviewToken = {
      id: tokenId,
      planHash,
      stateHash,
      relevantDeviceIds,
      relevantRooms,
      createdAt: now,
      expiresAt: now + lifetimeMs,
      signature: hashString(`${tokenId}:${planHash}:${stateHash}:${now}:${TokenConfig.tokenVersion}`),
    };

    // Store in authentication registry
    this.issuedTokens.set(token.id, {
      token,
      consumed: false,
      rawState: relevantState,
    });

    return token;
  }

  /**
   * Preview a command without any side effects on the live World Model.
   * Pure read-only computation returning plan, simulated diff, risk findings, and preview token.
   */
  static async preview(
    command: string,
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[]; rooms: RoomZone[]; timeOfDay?: number },
    speakerName: string = 'You'
  ): Promise<PreviewResult> {
    const speaker = world.people.find((p) => p.name === speakerName) || world.people[0];
    const intent = await Interpreter.interpret(command, speaker, world.rooms);
    const rawPlan = Planner.plan(intent, world);
    const simulation = Simulator.simulate(rawPlan, world.devices, world.doors, world.people, world.rooms);
    const { safePlan } = PolicyEngine.evaluateInvariants(rawPlan, world);
    const findings = PolicyEngine.evaluateSoftRisks(safePlan, simulation.diff, useAgentStore.getState().rules, {
      devices: world.devices,
      doors: world.doors,
      people: world.people,
      timeOfDay: world.timeOfDay || 12.0,
    });
    const recommendation = Recommender.synthesize(intent, safePlan, findings, world.people);
    const token = this.createToken(recommendation.primaryPlan, world);

    return {
      plan: recommendation.primaryPlan,
      diff: simulation.diff,
      findings,
      token,
      intent,
    };
  }

  /**
   * The ONLY authorized path that can mutate devices in SentinelHome.
   * Enforces:
   * 1. Token presence and authenticity
   * 2. Replay prevention (single-use)
   * 3. Expiration check
   * 4. State-drift verification on CURRENT live world
   * 5. Hard invariant re-check at actuation boundary
   */
  static async commit(
    token: PreviewToken | null | undefined,
    plan: PlanStep[],
    intent: Intent,
    diff: SimulationDiffItem[],
    findings: RiskFinding[],
    world: { devices: DeviceEntity[]; doors: DoorEntity[]; people: PersonEntity[]; rooms: RoomZone[] },
    speaker: string,
    executeFn?: typeof Executor.execute
  ): Promise<CommitResult> {
    const agentStore = useAgentStore.getState();

    // 1. Verify Token Presence
    if (!token || !token.id) {
      const msg = 'Actuation rejected: Missing or null preview token.';
      console.warn(`[CommitGuard] ${msg}`);
      return {
        status: 'INVALID_TOKEN',
        success: false,
        message: msg,
      };
    }

    // 2. Authenticate Token Record
    const record = this.issuedTokens.get(token.id);
    if (!record) {
      const msg = `Actuation rejected: Unrecognized or forged token ID "${token.id}".`;
      console.warn(`[CommitGuard] ${msg}`);
      return {
        status: 'INVALID_TOKEN',
        success: false,
        message: msg,
      };
    }

    // 3. Replay Prevention
    if (record.consumed) {
      const msg = `Actuation rejected: Token "${token.id}" has already been consumed (Replay Prevention).`;
      console.warn(`[CommitGuard] ${msg}`);
      return {
        status: 'INVALID_TOKEN',
        success: false,
        message: msg,
      };
    }

    // 4. Expiry Check
    const now = Date.now();
    if (now > token.expiresAt) {
      const msg = `Actuation rejected: Preview token expired ${((now - token.expiresAt) / 1000).toFixed(1)}s ago.`;
      console.warn(`[CommitGuard] ${msg}`);
      
      // Log EXPIRED to Audit Ledger
      agentStore.addAuditLog({
        id: `audit_expired_${now}`,
        timestamp: new Date().toLocaleTimeString(),
        command: intent.rawUnderstanding || intent.goal,
        speaker,
        intent,
        simulatedDiff: diff,
        findings,
        executedSteps: [],
        verificationResult: {
          success: false,
          mismatches: ['Token Expired'],
        },
      });

      return {
        status: 'EXPIRED',
        success: false,
        message: msg,
      };
    }

    // 5. Plan Integrity Check
    const currentPlanHash = this.computePlanHash(plan);
    if (currentPlanHash !== token.planHash) {
      const msg = 'Actuation rejected: Plan has been tampered with or modified since preview generation.';
      console.warn(`[CommitGuard] ${msg}`);
      return {
        status: 'INVALID_TOKEN',
        success: false,
        message: msg,
      };
    }

    // 6. Relevant-State Drift Check on Current World
    const currentRelevantState = this.extractRelevantState(
      world,
      token.relevantDeviceIds,
      token.relevantRooms
    );
    const currentStateHash = this.computeStateHash(currentRelevantState);

    if (currentStateHash !== token.stateHash) {
      // WORLD HAS DRIFTED!
      const driftDiff = this.computeStateDiff(record.rawState, currentRelevantState, world);
      const summaryMsg = `World state drifted between preview and approval (${driftDiff.length} change(s) detected).`;
      console.warn(`[CommitGuard] DRIFT DETECTED:`, driftDiff);

      // Create a fresh token for the drifted world state
      const newToken = this.createToken(plan, world);

      // Log DRIFTED to Audit Ledger
      agentStore.addAuditLog({
        id: `audit_drifted_${now}`,
        timestamp: new Date().toLocaleTimeString(),
        command: intent.rawUnderstanding || intent.goal,
        speaker,
        intent,
        simulatedDiff: diff,
        findings,
        executedSteps: [],
        verificationResult: {
          success: false,
          mismatches: driftDiff.map((d) => d.explanation),
        },
      });

      return {
        status: 'DRIFTED',
        success: false,
        driftDiff,
        message: summaryMsg,
        newToken,
      };
    }

    // 7. Re-verify Hard Safety Invariants at Actuation Boundary (Requirement E1)
    const { violations } = PolicyEngine.evaluateInvariants(plan, world);
    if (violations.length > 0) {
      const violationMsg = `Actuation aborted: Hard safety invariant violated at commit boundary: ${violations.join('; ')}`;
      console.error(`[CommitGuard] ${violationMsg}`);
      return {
        status: 'BLOCKED_INVARIANT',
        success: false,
        message: violationMsg,
      };
    }

    // 8. Consume Token
    record.consumed = true;

    // 9. Execute Device Mutations via Enforced Path
    const executor = executeFn || Executor.execute;
    const execResult = await executor(plan, intent, diff, findings, speaker);

    return {
      status: 'COMMITTED',
      success: execResult.success,
      executedSteps: execResult.executedSteps,
      message: `Successfully executed and verified ${execResult.executedSteps.length} step(s).`,
    };
  }
}
