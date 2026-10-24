import { PlanStep, AuditLogItem, Intent, RiskFinding, SimulationDiffItem } from '../types/agent';
import { useWorldStore } from '../store/useWorldStore';
import { useAgentStore } from '../store/useAgentStore';

export class Executor {
  /**
   * Sequentially executes approved steps with animated cadence and verification readback.
   */
  static async execute(
    plan: PlanStep[],
    intent: Intent,
    diff: SimulationDiffItem[],
    findings: RiskFinding[],
    speaker: string
  ): Promise<{ success: boolean; mismatches: string[]; executedSteps: PlanStep[] }> {
    const worldStore = useWorldStore.getState();
    const agentStore = useAgentStore.getState();

    const approvedSteps = plan.filter((s) => s.approved && !s.isBlockedByInvariant);
    const executedSteps: PlanStep[] = [];
    const mismatches: string[] = [];

    for (const step of approvedSteps) {
      // Small execution cadence delay for realistic simulation
      await new Promise((r) => setTimeout(r, 120));

      // 1. Apply to World Store
      worldStore.updateDeviceState(step.deviceId, step.targetState);

      // If mapped to a door, also update door state
      const door = worldStore.doors.find(
        (d) => d.lockDeviceId === step.deviceId || d.id === step.deviceId
      );
      if (door) {
        if (step.targetState.locked !== undefined) {
          worldStore.setDoorLocked(door.id, step.targetState.locked);
        }
        if (step.targetState.open !== undefined) {
          worldStore.setDoorOpen(door.id, step.targetState.open);
        }
      }

      executedSteps.push(step);

      // 2. Closed-Loop Telemetry Readback Verification
      const updatedDevices = useWorldStore.getState().devices;
      const deviceAfter = updatedDevices.find((d) => d.id === step.deviceId);

      if (deviceAfter) {
        for (const [key, expectedVal] of Object.entries(step.targetState)) {
          if (deviceAfter.state[key] !== expectedVal) {
            mismatches.push(
              `Telemetry Mismatch: ${deviceAfter.name}.${key} expected ${expectedVal}, but read back ${deviceAfter.state[key]}`
            );
          }
        }
      }
    }

    const isSuccess = mismatches.length === 0;

    // 3. Compile traceable Audit Log item
    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      command: intent.rawUnderstanding || intent.goal,
      speaker,
      intent,
      simulatedDiff: diff,
      findings,
      executedSteps,
      verificationResult: {
        success: isSuccess,
        mismatches,
      },
    };

    agentStore.addAuditLog(auditItem);

    return {
      success: isSuccess,
      mismatches,
      executedSteps,
    };
  }

  /**
   * One-click Reversible Undo for any executed plan.
   */
  static undo(auditLog: AuditLogItem): void {
    const worldStore = useWorldStore.getState();

    auditLog.executedSteps.forEach((step) => {
      worldStore.updateDeviceState(step.deviceId, step.currentState);
      const door = worldStore.doors.find(
        (d) => d.lockDeviceId === step.deviceId || d.id === step.deviceId
      );
      if (door) {
        if (step.currentState.locked !== undefined) {
          worldStore.setDoorLocked(door.id, step.currentState.locked);
        }
        if (step.currentState.open !== undefined) {
          worldStore.setDoorOpen(door.id, step.currentState.open);
        }
      }
    });

    auditLog.reverted = true;
  }
}
