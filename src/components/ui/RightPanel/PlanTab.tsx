import React from 'react';
import { 
  CheckSquare, 
  Square, 
  ShieldAlert, 
  Play, 
  XOctagon, 
  AlertTriangle, 
  HelpCircle,
  FileCheck2
} from 'lucide-react';
import { useAgentStore } from '../../../store/useAgentStore';
import { AgentOrchestrator } from '../../../agent/AgentOrchestrator';

export const PlanTab: React.FC = () => {
  const currentPlan = useAgentStore((state) => state.currentPlan);
  const currentIntent = useAgentStore((state) => state.currentIntent);
  const currentRecommendation = useAgentStore((state) => state.currentRecommendation);
  const activeToken = useAgentStore((state) => state.activeToken);
  const driftDiff = useAgentStore((state) => state.driftDiff);
  const clearDrift = useAgentStore((state) => state.clearDrift);
  const toggleStepApproval = useAgentStore((state) => state.toggleStepApproval);
  const approveAllSteps = useAgentStore((state) => state.approveAllSteps);
  const rejectAllSteps = useAgentStore((state) => state.rejectAllSteps);

  const approvedCount = currentPlan.filter((s) => s.approved && !s.isBlockedByInvariant).length;
  const blockedCount = currentPlan.filter((s) => s.isBlockedByInvariant).length;

  const handleExecute = async () => {
    await AgentOrchestrator.executeCurrentPlan();
  };

  if (!currentPlan || currentPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
        <FileCheck2 size={36} className="text-slate-600 mb-3" />
        <h3 className="text-sm font-bold text-slate-300">No Active Plan Pending</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Give a command in the Chat tab or click a preset to generate a candidate safety plan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full justify-between overflow-y-auto pr-1">
      <div>
        {/* DYNAMIC STATE DRIFT NOTIFICATION BANNER */}
        {driftDiff && driftDiff.length > 0 && (
          <div className="p-3 mb-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-300">
                <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                <span>State Drift Detected Prior to Commit</span>
              </div>
              <button
                onClick={clearDrift}
                className="text-[10px] text-amber-400 hover:text-white underline font-medium"
              >
                Dismiss
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
              The home's occupancy or device state shifted after this preview was issued. 
              A fresh token has been minted. Review the computed differences below:
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {driftDiff.map((d, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono">
                  <div className="text-amber-300 font-semibold">{d.explanation}</div>
                  <div className="text-slate-400 mt-0.5 flex items-center justify-between text-[9px]">
                    <span>Before: <span className="text-rose-300">{JSON.stringify(d.previewValue)}</span></span>
                    <span>&rarr;</span>
                    <span>Now: <span className="text-emerald-300">{JSON.stringify(d.currentValue)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOKEN SECURITY INDICATOR */}
        {activeToken && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1 py-1 mb-2 bg-slate-900/40 rounded-lg border border-white/5">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300">Token: {activeToken.id.substring(0, 15)}...</span>
            </span>
            <span className="text-sky-400">Guarded Actuation Active</span>
          </div>
        )}

        {/* INTENT & CONFIDENCE SUMMARY */}
        {currentIntent && (
          <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">
                Intent Deduction
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
                {(currentIntent.confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>
            <div className="text-xs font-semibold text-white">
              Goal: <span className="text-sky-300 font-mono">{currentIntent.goal}</span>
            </div>
            {currentRecommendation?.clarificationQuestion && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] flex items-start space-x-1.5">
                <HelpCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <span>{currentRecommendation.clarificationQuestion}</span>
              </div>
            )}
          </div>
        )}

        {/* BATCH ACTIONS HEADER */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
          <div className="text-slate-300 font-medium">
            Plan Steps: <span className="font-bold text-white">{currentPlan.length}</span> ({approvedCount} approved, {blockedCount} blocked)
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={approveAllSteps}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-semibold transition"
            >
              Approve All
            </button>
            <button
              onClick={rejectAllSteps}
              className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[11px] font-semibold transition"
            >
              Reject All
            </button>
          </div>
        </div>

        {/* DIFF TABLE / PLAN STEPS LIST */}
        <div className="space-y-2 mb-4">
          {currentPlan.map((step) => {
            const isBlocked = step.isBlockedByInvariant;
            const isApproved = step.approved;

            let riskColor = 'bg-slate-700/50 text-slate-300';
            if (step.riskSeverity === 'CRITICAL' || isBlocked) {
              riskColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
            } else if (step.riskSeverity === 'HIGH') {
              riskColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
            } else if (step.riskSeverity === 'MEDIUM') {
              riskColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
            } else if (step.riskSeverity === 'LOW' || step.riskSeverity === 'NONE') {
              riskColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            }

            return (
              <div
                key={step.id}
                onClick={() => !isBlocked && toggleStepApproval(step.id)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  isBlocked
                    ? 'bg-slate-900/30 border-rose-500/30 opacity-75 cursor-not-allowed'
                    : isApproved
                    ? 'bg-sky-500/10 border-sky-500/50'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    {/* Checkbox */}
                    <div className="mt-0.5 text-sky-400">
                      {isBlocked ? (
                        <ShieldAlert size={16} className="text-rose-400" />
                      ) : isApproved ? (
                        <CheckSquare size={16} className="text-emerald-400" />
                      ) : (
                        <Square size={16} className="text-slate-500" />
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white flex items-center space-x-2">
                        <span>{step.deviceName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({step.room})</span>
                      </div>

                      {/* State Transition Diff */}
                      <div className="text-[11px] text-sky-300 font-mono mt-0.5">
                        Action: <span className="font-bold uppercase">{step.action}</span> &rarr; Target:{' '}
                        {JSON.stringify(step.targetState)}
                      </div>

                      {/* Reason / Policy Justification */}
                      <div className="text-[10px] text-slate-300 mt-1 leading-snug">
                        {step.reason}
                      </div>

                      {/* Invariant Violation Message if Blocked */}
                      {isBlocked && (
                        <div className="mt-1.5 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-300 flex items-center space-x-1">
                          <XOctagon size={12} className="shrink-0" />
                          <span>{step.invariantViolationMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${riskColor}`}>
                    {isBlocked ? 'BLOCKED' : step.riskSeverity || 'SAFE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EXECUTE / APPROVAL ACTION BAR */}
      <div className="pt-3 border-t border-white/10 mt-auto">
        <button
          onClick={handleExecute}
          disabled={approvedCount === 0}
          className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center space-x-2 ${
            approvedCount > 0
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Play size={14} />
          <span>Execute & Verify Approved Plan ({approvedCount} Steps)</span>
        </button>
      </div>
    </div>
  );
};
