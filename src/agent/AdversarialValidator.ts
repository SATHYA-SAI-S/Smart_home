import { PlanStep, Intent } from '../types/agent';
import { DeviceEntity, RoomZone } from '../types/world';
import { DeviceTypeRegistry } from './WorldModel';

export interface ValidationIssue {
  stepId: string;
  deviceId?: string;
  reason: string;
  layer: 'schema_layer' | 'unrequested_flag';
}

export interface ValidationResult {
  valid: boolean;
  cleanPlan: PlanStep[];
  rejectedSteps: { step: PlanStep; reason: string }[];
  issues: ValidationIssue[];
  unrequestedStepsCount: number;
}

export class AdversarialValidator {
  /**
   * Validates planner output before sandbox simulation.
   * Enforces:
   * 1. Rejection of hallucinated/unknown devices
   * 2. Rejection of invalid rooms
   * 3. Rejection of impossible actions not in the Device Capability Schema
   * 4. Flagging of extraneous actions unrequested by the user's intent scope
   */
  static validate(
    rawPlan: PlanStep[],
    world: { devices: DeviceEntity[]; rooms: RoomZone[] },
    intent: Intent
  ): ValidationResult {
    const knownDeviceIds = new Set(world.devices.map((d) => d.id));
    const knownRoomIds = new Set(world.rooms.map((r) => r.id));

    const cleanPlan: PlanStep[] = [];
    const rejectedSteps: { step: PlanStep; reason: string }[] = [];
    const issues: ValidationIssue[] = [];
    let unrequestedStepsCount = 0;
    const seenDeviceActions = new Map<string, PlanStep>();

    for (const step of rawPlan) {
      // 0. Contradictory / Flapping Device Actions in Same Plan
      if (step.deviceId && seenDeviceActions.has(step.deviceId)) {
        const prevStep = seenDeviceActions.get(step.deviceId)!;
        const conflictingState = Object.keys(step.targetState || {}).some(
          (k) => prevStep.targetState?.[k] !== undefined && prevStep.targetState[k] !== step.targetState[k]
        );
        if (conflictingState || prevStep.action !== step.action) {
          const reason = `SCHEMA VALIDATION REJECTION: Contradictory flapping actions detected for device "${step.deviceId}" in the same plan (${prevStep.action} vs ${step.action}).`;
          rejectedSteps.push({ step, reason });
          issues.push({ stepId: step.id, deviceId: step.deviceId, reason, layer: 'schema_layer' });
          continue;
        }
      }
      if (step.deviceId) {
        seenDeviceActions.set(step.deviceId, step);
      }

      // 1. Unknown or Hallucinated Device Check
      if (!step.deviceId || !knownDeviceIds.has(step.deviceId)) {
        const reason = `SCHEMA VALIDATION REJECTION: Unknown or hallucinated deviceId "${step.deviceId}". Device does not exist in residence.`;
        rejectedSteps.push({ step, reason });
        issues.push({ stepId: step.id, deviceId: step.deviceId, reason, layer: 'schema_layer' });
        continue;
      }

      // 2. Unknown Room Check
      if (step.room && !knownRoomIds.has(step.room)) {
        const reason = `SCHEMA VALIDATION REJECTION: Invalid or non-existent room "${step.room}".`;
        rejectedSteps.push({ step, reason });
        issues.push({ stepId: step.id, deviceId: step.deviceId, reason, layer: 'schema_layer' });
        continue;
      }

      // 3. Capability Action Check
      const device = world.devices.find((d) => d.id === step.deviceId);
      if (device) {
        const schema = DeviceTypeRegistry.get(device.type);
        if (schema && step.action) {
          const validActions = Object.keys(schema.actions);
          const isStandardSwitch = step.action === 'turn_on' || step.action === 'turn_off' || step.action === 'dim' || step.action === 'lock' || step.action === 'unlock';
          
          if (!validActions.includes(step.action) && !isStandardSwitch) {
            const reason = `SCHEMA VALIDATION REJECTION: Action "${step.action}" is physically impossible for device type "${device.type}".`;
            rejectedSteps.push({ step, reason });
            issues.push({ stepId: step.id, deviceId: step.deviceId, reason, layer: 'schema_layer' });
            continue;
          }
        }
      }

      // 4. Intent Scope Discrepancy Flagging
      // If user specified an explicit scope (e.g. 'bedroom' or 'fan'), flag steps touching completely outside that scope
      const explicitScope = intent.scope?.toLowerCase() || '';
      if (
        explicitScope && 
        explicitScope !== 'all' && 
        explicitScope !== 'unspecified' &&
        step.room &&
        !explicitScope.includes(step.room.toLowerCase()) &&
        !explicitScope.includes(step.deviceType.toLowerCase()) &&
        !step.deviceId.toLowerCase().includes(explicitScope)
      ) {
        unrequestedStepsCount++;
        issues.push({
          stepId: step.id,
          deviceId: step.deviceId,
          reason: `POTENTIAL UNREQUESTED ACTION: Step targets ${step.deviceName} in "${step.room}", but user requested scope "${explicitScope}".`,
          layer: 'unrequested_flag',
        });
      }

      cleanPlan.push(step);
    }

    return {
      valid: rejectedSteps.length === 0,
      cleanPlan,
      rejectedSteps,
      issues,
      unrequestedStepsCount,
    };
  }
}
