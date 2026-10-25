import React from 'react';
import { 
  CheckSquare, 
  Square, 
  ShieldAlert, 
  Play, 
  XOctagon, 
  AlertTriangle, 
  HelpCircle,
  FileCheck2,
  Clock,
  Gauge,
  AlertCircle,
  Sparkles
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
  const timeSimulation = useAgentStore((state) => state.timeSimulation);
  const selectedTimelineMinutes = useAgentStore((state) => state.selectedTimelineMinutes);
  const setSelectedTimelineMinutes = useAgentStore((state) => state.setSelectedTimelineMinutes);
  const damageReport = useAgentStore((state) => state.damageReport);
  const literalDamageReport = useAgentStore((state) => state.literalDamageReport);

  const [planView, setPlanView] = React.useState<'safe' | 'literal'>('safe');
  const toggleStepApproval = useAgentStore((state) => state.toggleStepApproval);
  const approveAllSteps = useAgentStore((state) => state.approveAllSteps);
  const rejectAllSteps = useAgentStore((state) => state.rejectAllSteps);

  const activeCheckpoint = timeSimulation?.checkpoints.find((c) => c.timeMinutes === selectedTimelineMinutes) || timeSimulation?.checkpoints[0];

  const displayedPlan = planView === 'safe'
    ? currentPlan
    : currentPlan.map((s) => ({ ...s, isBlockedByInvariant: false, approved: true }));

  const approvedCount = displayedPlan.filter((s) => s.approved && !s.isBlockedByInvariant).length;
  const blockedCount = displayedPlan.filter((s) => s.isBlockedByInvariant).length;

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

        {/* C2: TIME-AWARE SIMULATION TIMELINE SCRUBBER */}
        {timeSimulation && timeSimulation.checkpoints.length > 0 && (
          <div className="p-3 bg-slate-900/70 rounded-xl border border-indigo-500/20 mb-3 shadow-md">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                <Clock size={12} className="text-indigo-400" />
                <span>Sandbox Time Projection</span>
              </span>
              {timeSimulation.timeOnlyCatches.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[9px] font-bold border border-rose-500/30 flex items-center space-x-1">
                  <AlertCircle size={10} />
                  <span>{timeSimulation.timeOnlyCatches.length} Delayed Hazard(s)</span>
                </span>
              )}
            </div>

            {/* Checkpoint selector buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {timeSimulation.checkpoints.map((cp) => {
                const isSelected = cp.timeMinutes === selectedTimelineMinutes;
                const hasTimeOnly = cp.timeOnlyHazards.length > 0;
                return (
                  <button
                    key={cp.timeMinutes}
                    onClick={() => setSelectedTimelineMinutes(cp.timeMinutes)}
                    className={`py-1 px-1 rounded-lg text-[10px] font-semibold transition flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-sky-600 text-white shadow-md'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    } ${hasTimeOnly ? 'border border-rose-500/40' : ''}`}
                  >
                    <span>{cp.label}</span>
                    {hasTimeOnly && (
                      <span className="w-1 h-1 rounded-full bg-rose-400 mt-0.5 animate-ping"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Checkpoint Environment Status */}
            {activeCheckpoint && (() => {
              const planTouchesFridge = displayedPlan.some((s) => s.deviceId.includes('fridge') || s.deviceId.includes('refrigerator') || s.deviceId.includes('breaker') || s.deviceId.includes('main'));
              const planTouchesFan = displayedPlan.some((s) => s.deviceType === 'fan');
              const planTouchesLight = displayedPlan.some((s) => s.deviceType === 'light');
              const planTouchesClimate = displayedPlan.some((s) => s.deviceType === 'ac');
              const planTouchesStove = displayedPlan.some((s) => s.deviceId.includes('stove') || s.deviceType === 'stove');
              const planTouchesMedical = displayedPlan.some((s) => s.deviceId.includes('medical'));
              const planTouchesDoors = displayedPlan.some((s) => s.deviceType === 'door_lock' || s.deviceType === 'garage_door' || s.deviceType === 'gate' || s.action === 'lock' || s.action === 'unlock' || s.action === 'close' || s.action === 'open');

              return (
                <div className="p-2 rounded-lg bg-black/30 border border-white/5 text-[10px] text-slate-300 font-mono space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>Selected: <span className="text-white font-bold">{activeCheckpoint.label}</span></span>
                    <span>Findings: <span className="text-amber-400 font-bold">{activeCheckpoint.findings.length}</span></span>
                  </div>

                  {/* Refrigerator Telemetry - Only shown if command affects refrigeration or main power */}
                  {planTouchesFridge && activeCheckpoint.environmentalValues.fridgeTempC !== undefined && (
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-slate-400">Fridge Temp:</span>
                      <span className={activeCheckpoint.environmentalValues.fridgeTempC >= 4.0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {activeCheckpoint.environmentalValues.fridgeTempC}°C {activeCheckpoint.environmentalValues.fridgeTempC >= 4.0 ? '(Spoilage Risk)' : '(Nominal)'}
                      </span>
                    </div>
                  )}

                  {/* Fan Telemetry - Shown if command affects fans */}
                  {planTouchesFan && displayedPlan.filter((s) => s.deviceType === 'fan').map((s) => {
                    const simDev = activeCheckpoint.simulatedDevices.find((d) => d.id === s.deviceId);
                    const pwr = simDev?.state.power ?? s.targetState.power ?? 'off';
                    return (
                      <div key={s.deviceId} className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-400">{s.deviceName}:</span>
                        <span className={pwr === 'on' ? 'text-sky-400 font-bold' : 'text-slate-400 font-medium'}>
                          {pwr === 'on' ? 'Active Circulation' : 'Off (Airflow Idle)'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Lighting Telemetry - Shown if command affects lights */}
                  {planTouchesLight && displayedPlan.filter((s) => s.deviceType === 'light').slice(0, 3).map((s) => {
                    const simDev = activeCheckpoint.simulatedDevices.find((d) => d.id === s.deviceId);
                    const pwr = simDev?.state.power ?? s.targetState.power ?? 'off';
                    return (
                      <div key={s.deviceId} className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-400">{s.deviceName}:</span>
                        <span className={pwr === 'on' ? 'text-amber-300 font-bold' : 'text-slate-500'}>
                          {pwr === 'on' ? 'Illuminated' : 'Extinguished'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Climate Telemetry - Shown if command affects AC / climate */}
                  {planTouchesClimate && Object.entries(activeCheckpoint.environmentalValues.roomTempsC || {}).slice(0, 2).map(([rId, temp]) => (
                    <div key={rId} className="flex items-center justify-between text-[9px]">
                      <span className="text-slate-400">Room Temp ({rId}):</span>
                      <span className={temp >= 26.0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {temp.toFixed(1)}°C
                      </span>
                    </div>
                  ))}

                  {/* Stove Telemetry - Shown if command affects cooktop */}
                  {planTouchesStove && activeCheckpoint.environmentalValues.stoveUnattendedMinutes !== undefined && (
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-slate-400">Stove Unattended:</span>
                      <span className={activeCheckpoint.environmentalValues.stoveUnattendedMinutes >= 20 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {activeCheckpoint.environmentalValues.stoveUnattendedMinutes} min
                      </span>
                    </div>
                  )}

                  {/* Medical Telemetry - Shown if command affects medical device */}
                  {planTouchesMedical && activeCheckpoint.environmentalValues.medicalBatteryPercent !== undefined && (
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-slate-400">Medical Backup:</span>
                      <span className={activeCheckpoint.environmentalValues.medicalBatteryPercent <= 20 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {activeCheckpoint.environmentalValues.medicalBatteryPercent}%
                      </span>
                    </div>
                  )}

                  {/* Doors / Perimeter Telemetry - Shown if command affects doors */}
                  {planTouchesDoors && displayedPlan.filter((s) => s.deviceType === 'door_lock' || s.deviceType === 'garage_door' || s.deviceType === 'gate').map((s) => {
                    const simDoor = activeCheckpoint.simulatedDoors.find((d) => d.lockDeviceId === s.deviceId || d.id === s.deviceId);
                    const stateStr = simDoor
                      ? `${simDoor.isOpen ? 'Open' : 'Closed'} / ${simDoor.isLocked ? 'Locked' : 'Unlocked'}`
                      : `${s.action.toUpperCase()}`;
                    return (
                      <div key={s.deviceId} className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-400">{s.deviceName}:</span>
                        <span className="text-sky-300 font-bold">{stateStr}</span>
                      </div>
                    );
                  })}

                  {/* Generic Fallback for other commands */}
                  {!planTouchesFridge && !planTouchesFan && !planTouchesLight && !planTouchesClimate && !planTouchesStove && !planTouchesMedical && !planTouchesDoors && displayedPlan.slice(0, 3).map((s) => {
                    const simDev = activeCheckpoint.simulatedDevices.find((d) => d.id === s.deviceId);
                    return (
                      <div key={s.deviceId} className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-400">{s.deviceName}:</span>
                        <span className="text-white font-medium">
                          {simDev?.state.power ?? s.action}
                        </span>
                      </div>
                    );
                  })}

                  {activeCheckpoint.timeOnlyHazards.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-white/5 text-[9px] text-rose-300 font-sans">
                      <span className="font-bold">⚠️ Triggered at this checkpoint:</span>
                      <ul className="list-disc list-inside mt-0.5 text-[9px] text-rose-200">
                        {activeCheckpoint.timeOnlyHazards.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* LITERAL VS SAFE PLAN TOGGLE */}
        <div className="flex items-center justify-between p-1 bg-slate-900/60 rounded-xl border border-white/5 mb-3">
          <button
            onClick={() => setPlanView('safe')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center space-x-1 ${
              planView === 'safe'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            <span>Safe Plan (Protected)</span>
          </button>
          <button
            onClick={() => setPlanView('literal')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center space-x-1 ${
              planView === 'literal'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={12} />
            <span>Literal (Naive Baseline)</span>
          </button>
        </div>

        {/* C3: MODEL-BASED PROBABILITY OF DAMAGE CARD */}
        {(damageReport || literalDamageReport) && (
          <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 mb-3 shadow">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                <Gauge size={12} className="text-amber-400" />
                <span>Damage Probability Analysis</span>
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {damageReport?.monteCarlo.samples ?? 500} MC Runs
              </span>
            </div>

            {/* Before vs After Repair Comparison */}
            <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="text-[9px] text-rose-300 font-bold uppercase">Literal Plan</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {((literalDamageReport?.nominalProbabilityAnyHarm ?? 0) * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Exp Harm: {literalDamageReport?.totalExpectedHarm.toFixed(2) ?? '0.00'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[9px] text-emerald-300 font-bold uppercase">Safe Plan (Repaired)</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">
                  {((damageReport?.nominalProbabilityAnyHarm ?? 0) * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Exp Harm: {damageReport?.totalExpectedHarm.toFixed(2) ?? '0.00'}
                </div>
              </div>
            </div>

            {/* Monte Carlo 90% Uncertainty Interval */}
            {damageReport && (
              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between px-1">
                <span>90% Uncertainty Interval:</span>
                <span className="text-sky-300 font-bold">
                  [{((damageReport.monteCarlo.ci90Lower) * 100).toFixed(1)}% – {((damageReport.monteCarlo.ci90Upper) * 100).toFixed(1)}%]
                </span>
              </div>
            )}

            {/* Mandatory Disclaimer */}
            <div className="mt-1.5 pt-1 border-t border-white/5 text-[8px] text-slate-500 italic text-center">
              model-based estimate, not empirically calibrated
            </div>
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
          {displayedPlan.map((step) => {
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
