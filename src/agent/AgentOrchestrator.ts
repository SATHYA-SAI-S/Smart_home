import { useWorldStore } from '../store/useWorldStore';
import { useAgentStore } from '../store/useAgentStore';
import { Interpreter } from './Interpreter';
import { Planner } from './Planner';
import { Simulator } from './Simulator';
import { PolicyEngine } from './PolicyEngine';
import { Recommender } from './Recommender';
import { Executor } from './Executor';
import { CommitGuard } from './CommitGuard';
import { StageStatus, CommitResult } from '../types/agent';

export class AgentOrchestrator {
  /**
   * Runs the full 6-stage autonomous agent pipeline
   */
  static async runPipeline(prompt: string, speakerName?: string): Promise<void> {
    const worldStore = useWorldStore.getState();
    const agentStore = useAgentStore.getState();

    const speaker =
      worldStore.people.find((p) => p.name === (speakerName || agentStore.currentSpeaker)) ||
      worldStore.people[0];

    // Initial message from user
    agentStore.addMessage({
      sender: 'user',
      speaker: speaker.name,
      text: prompt,
    });

    // Create Agent response message placeholder with 6-stage stepper
    const stages: StageStatus[] = [
      { stage: 'understanding', status: 'running', label: '1. Understand Intent' },
      { stage: 'simulating', status: 'pending', label: '2. Simulate Sandbox' },
      { stage: 'analyzing', status: 'pending', label: '3. Risk & Invariant Check' },
      { stage: 'recommending', status: 'pending', label: '4. Recommend Safe Plan' },
      { stage: 'confirming', status: 'pending', label: '5. Confirmation Gate' },
      { stage: 'executing', status: 'pending', label: '6. Execute & Verify' },
    ];

    const agentMsgId = agentStore.addMessage({
      sender: 'agent',
      text: `Processing: "${prompt}"...`,
      stageStatuses: stages,
      isComplete: false,
    });

    try {
      // -----------------------------------------------------------------
      // STAGE 1: UNDERSTAND INTENT
      // -----------------------------------------------------------------
      agentStore.updateStage(0, 'running', 'Extracting goals and semantic constraints...');
      const intent = await Interpreter.interpret(prompt, speaker, worldStore.rooms);
      useAgentStore.setState({ currentIntent: intent });

      agentStore.updateStage(
        0,
        'done',
        `Goal: [${intent.goal}], Scope: [${intent.scope}], Confidence: ${(intent.confidence * 100).toFixed(0)}%`
      );

      // -----------------------------------------------------------------
      // STAGE 2: PLAN & SIMULATE
      // -----------------------------------------------------------------
      agentStore.updateStage(1, 'running', 'Querying device schemas & generating virtual sandbox clone...');
      const rawPlan = Planner.plan(intent, {
        rooms: worldStore.rooms,
        devices: worldStore.devices,
        doors: worldStore.doors,
        people: worldStore.people,
      });

      const simulation = Simulator.simulate(
        rawPlan,
        worldStore.devices,
        worldStore.doors,
        worldStore.people,
        worldStore.rooms
      );
      useAgentStore.setState({ currentDiff: simulation.diff });

      // C2: Run Time-Aware Fast-Forward Sandbox Simulation
      const timeSim = Simulator.fastForward(
        {
          devices: worldStore.devices,
          doors: worldStore.doors,
          people: worldStore.people,
          rooms: worldStore.rooms,
          timeOfDay: worldStore.timeOfDay,
        },
        rawPlan
      );
      agentStore.setTimeSimulation(timeSim);

      const timeOnlySummary = timeSim.timeOnlyCatches.length > 0
        ? ` (${timeSim.timeOnlyCatches.length} time-delayed hazards detected across +5m/+1h/+8h)`
        : '';

      agentStore.updateStage(
        1,
        'done',
        `Derived ${rawPlan.length} candidate step(s), ${simulation.diff.length} state diff(s)${timeOnlySummary}.`
      );

      // -----------------------------------------------------------------
      // STAGE 3: RISK & HARD INVARIANT POLICY EVALUATION
      // -----------------------------------------------------------------
      agentStore.updateStage(2, 'running', 'Evaluating deterministic hard invariants and soft risk heuristics...');
      const { safePlan, violations } = PolicyEngine.evaluateInvariants(rawPlan, {
        devices: worldStore.devices,
        doors: worldStore.doors,
        people: worldStore.people,
        rooms: worldStore.rooms,
      });

      const findings = PolicyEngine.evaluateSoftRisks(safePlan, simulation.diff, agentStore.rules, {
        devices: worldStore.devices,
        doors: worldStore.doors,
        people: worldStore.people,
        timeOfDay: worldStore.timeOfDay,
      });

      const riskSummary =
        violations.length > 0
          ? `${violations.length} hard invariant(s) blocked! ${findings.length} risk finding(s).`
          : `${findings.length} soft risk finding(s) detected.`;

      agentStore.updateStage(2, violations.length > 0 ? 'blocked' : 'done', riskSummary);

      // -----------------------------------------------------------------
      // STAGE 4: RECOMMEND SAFE PLAN
      // -----------------------------------------------------------------
      agentStore.updateStage(3, 'running', 'Synthesizing Pareto-optimal safe plan & alternatives...');
      const recommendation = Recommender.synthesize(
        intent,
        safePlan,
        findings,
        worldStore.people
      );

      agentStore.updateMessageRecommendation(agentMsgId, recommendation, findings);
      agentStore.updateStage(3, 'done', recommendation.summaryExplanation);

      // -----------------------------------------------------------------
      // C1: GENERATE STATE-AWARE PREVIEW TOKEN (Read-only, no mutations)
      // -----------------------------------------------------------------
      const token = CommitGuard.createToken(recommendation.primaryPlan, {
        devices: worldStore.devices,
        doors: worldStore.doors,
        people: worldStore.people,
        rooms: worldStore.rooms,
      });
      agentStore.setActiveToken(token);
      agentStore.clearDrift();

      // Automatically switch to Plan Tab so user can review the generated plan
      if (recommendation.primaryPlan && recommendation.primaryPlan.length > 0) {
        agentStore.setActiveTab('plan');
      }

      // -----------------------------------------------------------------
      // STAGE 5: CONFIRMATION GATE
      // -----------------------------------------------------------------
      const autonomy = agentStore.autonomyLevel;
      const hasRisksOrViolations = findings.length > 0 || violations.length > 0;
      let shouldAutoApprove = false;

      if (autonomy === 'auto_safe' && !hasRisksOrViolations) {
        shouldAutoApprove = true;
      } else if (autonomy === 'ask_on_risk' && !hasRisksOrViolations) {
        shouldAutoApprove = true;
      }

      if (!shouldAutoApprove) {
        agentStore.updateStage(
          4,
          'blocked',
          `Awaiting human confirmation (Autonomy Level: "${autonomy}"). Review plan in Tab 2.`
        );

        // Ensure user is on the Plan Tab to view and approve
        agentStore.setActiveTab('plan');

        // Update message text
        agentStore.updateMessageStages(
          agentMsgId,
          useAgentStore.getState().stageStatuses,
          false
        );
        return;
      }

      // Auto-approved
      agentStore.updateStage(4, 'done', 'Auto-approved under current autonomy policy.');

      // -----------------------------------------------------------------
      // STAGE 6: EXECUTE & VERIFY THROUGH COMMITGUARD
      // -----------------------------------------------------------------
      agentStore.updateStage(5, 'running', 'Verifying token & executing device transitions...');
      const commitResult = await CommitGuard.commit(
        token,
        recommendation.primaryPlan,
        intent,
        simulation.diff,
        findings,
        {
          devices: worldStore.devices,
          doors: worldStore.doors,
          people: worldStore.people,
          rooms: worldStore.rooms,
        },
        speaker.name
      );

      if (commitResult.status === 'COMMITTED' && commitResult.success) {
        agentStore.updateStage(
          5,
          'done',
          `Verified: ${commitResult.executedSteps?.length || 0} step(s) applied with 0 mismatches.`
        );
        agentStore.setActiveToken(null);
      } else {
        agentStore.updateStage(
          5,
          'error',
          `Execution issue (${commitResult.status}): ${commitResult.message}`
        );
      }

      agentStore.updateMessageStages(
        agentMsgId,
        useAgentStore.getState().stageStatuses,
        true
      );
    } catch (err: any) {
      console.error('[AgentOrchestrator] Pipeline error:', err);
      agentStore.updateStage(0, 'error', `Execution failure: ${err?.message || err}`);
    }
  }

  /**
   * Executes currently approved steps in Plan Tab through the enforced CommitGuard boundary.
   */
  static async executeCurrentPlan(): Promise<CommitResult> {
    const agentStore = useAgentStore.getState();
    const worldStore = useWorldStore.getState();
    const plan = agentStore.currentPlan;
    const token = agentStore.activeToken;
    const intent = agentStore.currentIntent || {
      goal: 'manual_plan_execution',
      scope: 'all',
      urgency: 'NORMAL',
      speaker: agentStore.currentSpeaker,
      constraints: [],
      confidence: 1.0,
      ambiguities: [],
    };

    agentStore.updateStage(4, 'running', 'Verifying preview token & relevant world state integrity...');

    const commitResult = await CommitGuard.commit(
      token,
      plan,
      intent,
      agentStore.currentDiff,
      agentStore.currentFindings,
      {
        devices: worldStore.devices,
        doors: worldStore.doors,
        people: worldStore.people,
        rooms: worldStore.rooms,
      },
      agentStore.currentSpeaker
    );

    if (commitResult.status === 'DRIFTED') {
      agentStore.setDriftDiff(commitResult.driftDiff || null);
      if (commitResult.newToken) {
        agentStore.setActiveToken(commitResult.newToken);
      }
      agentStore.updateStage(
        4,
        'blocked',
        `DRIFT DETECTED: World state changed during review (${commitResult.driftDiff?.length} diffs). Review banner and re-approve.`
      );
      agentStore.addMessage({
        sender: 'system',
        text: `⚠️ State Drift Detected: ${commitResult.message} Please review the state differences in the Plan Tab and re-approve.`,
        isComplete: true,
      });
      return commitResult;
    }

    if (commitResult.status === 'EXPIRED') {
      const newToken = CommitGuard.createToken(plan, {
        devices: worldStore.devices,
        doors: worldStore.doors,
        people: worldStore.people,
        rooms: worldStore.rooms,
      });
      agentStore.setActiveToken(newToken);
      agentStore.updateStage(
        4,
        'blocked',
        `Preview token expired. Fresh token generated. Please re-confirm execution.`
      );
      agentStore.addMessage({
        sender: 'system',
        text: `⏳ Approval Token Expired: The preview window elapsed. A fresh token was generated for re-approval.`,
        isComplete: true,
      });
      return commitResult;
    }

    if (commitResult.status === 'BLOCKED_INVARIANT') {
      agentStore.updateStage(5, 'blocked', commitResult.message);
      agentStore.addMessage({
        sender: 'agent',
        text: `❌ Actuation Aborted: ${commitResult.message}`,
        isComplete: true,
      });
      return commitResult;
    }

    if (commitResult.status === 'COMMITTED' && commitResult.success) {
      agentStore.updateStage(4, 'done', 'Approved & Committed.');
      agentStore.updateStage(
        5,
        'done',
        `Success: ${commitResult.executedSteps?.length || 0} step(s) verified in 3D home.`
      );
      agentStore.clearDrift();
      agentStore.setActiveToken(null);
      agentStore.addMessage({
        sender: 'agent',
        text: `Plan executed: ${commitResult.executedSteps?.length || 0} devices updated and verified in 3D simulator.`,
        isComplete: true,
      });
      return commitResult;
    }

    agentStore.updateStage(5, 'error', commitResult.message);
    return commitResult;
  }
}
