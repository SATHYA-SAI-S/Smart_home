import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Filter 
} from 'lucide-react';
import { useAgentStore } from '../../../store/useAgentStore';
import { Executor } from '../../../agent/Executor';

export const AuditTab: React.FC = () => {
  const auditLogs = useAgentStore((state) => state.auditLogs);
  const [filterSpeaker, setFilterSpeaker] = useState<string>('all');

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sentinel_home_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleUndo = (logItem: any) => {
    Executor.undo(logItem);
  };

  const filteredLogs = auditLogs.filter(
    (log) => filterSpeaker === 'all' || log.speaker === filterSpeaker
  );

  return (
    <div className="flex flex-col h-full justify-between overflow-y-auto pr-1">
      <div>
        {/* HEADER & CONTROLS */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <History size={14} className="text-sky-400" />
            <span className="font-bold">Audit Ledger ({auditLogs.length})</span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterSpeaker}
              onChange={(e) => setFilterSpeaker(e.target.value)}
              className="bg-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 border border-slate-700"
            >
              <option value="all">All Speakers</option>
              <option value="You">You</option>
              <option value="Grandpa">Grandpa</option>
              <option value="Kid">Kid</option>
            </select>

            <button
              onClick={handleExportJSON}
              disabled={auditLogs.length === 0}
              className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition text-xs flex items-center space-x-1 px-2 font-medium"
              title="Export Complete Traceable Ledger to JSON"
            >
              <Download size={12} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* LOGS TIMELINE */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No audit records yet. Execute commands to populate the ledger.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs relative"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span className="font-bold text-sky-400">{log.speaker}</span>
                  <span>{log.timestamp}</span>
                </div>

                <div className="font-bold text-white text-xs mb-1">
                  "{log.command}"
                </div>

                <div className="text-[11px] text-slate-300 mb-2 font-mono">
                  Goal: [{log.intent.goal}] • {log.executedSteps.length} step(s) applied
                </div>

                {/* Diff Summary */}
                {log.simulatedDiff && log.simulatedDiff.length > 0 && (
                  <div className="text-[10px] bg-slate-950/60 rounded p-2 mb-2 text-slate-300 space-y-0.5">
                    {log.simulatedDiff.map((d, di) => (
                      <div key={di}>
                        &bull; <span className="font-bold text-slate-200">{d.deviceName}</span>: {d.property} ({String(d.before)} &rarr; {String(d.after)})
                      </div>
                    ))}
                  </div>
                )}

                {/* Telemetry Result */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center space-x-1 text-[10px]">
                    {log.verificationResult.success ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Verified Nominal</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} className="text-rose-400" />
                        <span className="text-rose-400 font-semibold">Mismatch Reported</span>
                      </>
                    )}
                  </div>

                  {/* Revert / Undo Button */}
                  <button
                    onClick={() => handleUndo(log)}
                    disabled={log.reverted}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition flex items-center space-x-1 ${
                      log.reverted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    }`}
                  >
                    <RotateCcw size={10} />
                    <span>{log.reverted ? 'Reverted' : 'Undo Action'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
