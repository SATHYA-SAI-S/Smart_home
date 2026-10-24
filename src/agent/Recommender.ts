import { 
  Intent, 
  PlanStep, 
  RiskFinding, 
  PlanRecommendation, 
  PlanAlternative 
} from '../types/agent';
import { PersonEntity } from '../types/world';

export class Recommender {
  static synthesize(
    intent: Intent,
    rawPlan: PlanStep[],
    findings: RiskFinding[],
    people: PersonEntity[]
  ): PlanRecommendation {
    // 1. Synthesize Pareto-Safe Primary Plan
    const primaryPlan: PlanStep[] = [];

    for (const step of rawPlan) {
      // If blocked by invariant, never execute as-is
      if (step.isBlockedByInvariant) {
        primaryPlan.push({
          ...step,
          approved: false,
          reason: `BLOCKED: ${step.invariantViolationMessage}`,
        });
        continue;
      }

      // Check if soft risk applies to this step
      const relevantFinding = findings.find((f) =>
        f.affectedDevices?.includes(step.deviceId) ||
        f.affectedPeople?.some((name) => {
          const p = people.find((person) => person.name === name);
          return p && p.currentRoom === step.room;
        })
      );

      if (relevantFinding && relevantFinding.severity === 'MEDIUM' && step.deviceType === 'light') {
        // Safe modification: Dim instead of total blackout for vulnerable person
        primaryPlan.push({
          ...step,
          action: 'dim',
          targetState: { level: 20 },
          reason: `MODIFIED FOR SAFETY: Dim to 20% soft lighting to preserve visibility for resting occupant.`,
          approved: true,
          riskSeverity: 'LOW',
        });
      } else {
        primaryPlan.push({
          ...step,
          approved: true,
          riskSeverity: relevantFinding ? relevantFinding.severity : 'NONE',
        });
      }
    }

    // 2. Synthesize Plan Alternatives
    const alternatives: PlanAlternative[] = [
      {
        id: 'alt_safe_requested',
        title: 'As Requested but Safe (Recommended)',
        description: 'Satisfies primary goal while enforcing all hard invariants and occupant safeguards.',
        steps: primaryPlan,
        riskScore: findings.reduce((acc, f) => acc + f.score, 0),
      },
      {
        id: 'alt_conservative',
        title: 'Conservative Non-Intrusive',
        description: 'Preserves all current occupant comfort zones and only touches vacant rooms.',
        steps: primaryPlan.filter((s) => !s.reason.includes('MODIFIED') && !s.isBlockedByInvariant),
        riskScore: 0.5,
      },
      {
        id: 'alt_minimal',
        title: 'Minimal Perimeter Only',
        description: 'Only engages perimeter security deadbolts without altering interior states.',
        steps: primaryPlan.filter((s) => s.action === 'lock' && !s.isBlockedByInvariant),
        riskScore: 0.2,
      },
    ];

    // 3. Clarification Question if confidence is low or ambiguous
    let clarificationQuestion: string | undefined = undefined;
    if (intent.confidence < 0.65 || intent.ambiguities.length > 0) {
      clarificationQuestion = intent.ambiguities[0] ||
        `Did you mean to adjust devices in your current room (${intent.scope}) or across the entire residence?`;
    }

    // 4. Summary explanation
    const blockedCount = primaryPlan.filter((s) => s.isBlockedByInvariant).length;
    const modifiedCount = primaryPlan.filter((s) => s.reason.includes('MODIFIED')).length;

    let summaryExplanation = `Prepared safe action plan for intent "${intent.goal}".`;
    if (blockedCount > 0) {
      summaryExplanation += ` ${blockedCount} unsafe action(s) blocked by hard invariants.`;
    }
    if (modifiedCount > 0) {
      summaryExplanation += ` ${modifiedCount} action(s) adjusted with safer alternatives.`;
    }

    return {
      primaryPlan,
      alternatives,
      clarificationQuestion,
      summaryExplanation,
    };
  }
}
