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
          const score = 3 * 0.9 * vuln * 1.0; // Severity (High=3) x Likelihood (0.9) x Vuln x Irreversibility

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

      // 2. Vulnerable Occupant Light & Climate Comfort
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

      // 3. Perimeter Exposure at Night
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
