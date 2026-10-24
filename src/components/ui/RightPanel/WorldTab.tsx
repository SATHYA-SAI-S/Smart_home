import React from 'react';
import { 
  Users, 
  Cpu, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Lock, 
  Power,
  RefreshCw
} from 'lucide-react';
import { useWorldStore } from '../../../store/useWorldStore';
import { useAgentStore } from '../../../store/useAgentStore';
import { PolicyEngine } from '../../../agent/PolicyEngine';

export const WorldTab: React.FC = () => {
  const rooms = useWorldStore((state) => state.rooms);
  const people = useWorldStore((state) => state.people);
  const devices = useWorldStore((state) => state.devices);
  const doors = useWorldStore((state) => state.doors);
  const timeOfDay = useWorldStore((state) => state.timeOfDay);
  const rules = useAgentStore((state) => state.rules);
  const addMessage = useAgentStore((state) => state.addMessage);

  // Scan live hazards
  const findings = PolicyEngine.evaluateSoftRisks([], [], rules, {
    devices,
    doors,
    people,
    timeOfDay,
  });

  const totalWatts = devices.reduce((sum, d) => {
    if (d.state.power === 'on') return sum + (d.powerConsumptionWatts || 0);
    return sum;
  }, 0);

  const handleRunSafetyCheck = () => {
    const findingsNow = PolicyEngine.evaluateSoftRisks([], [], rules, {
      devices,
      doors,
      people,
      timeOfDay,
    });

    if (findingsNow.length === 0) {
      addMessage({
        sender: 'agent',
        text: `Safety Inspection Complete: All systems nominal. 0 active hazards detected across 7 residential zones.`,
        isComplete: true,
      });
    } else {
      addMessage({
        sender: 'agent',
        text: `Safety Inspection Alert: ${findingsNow.length} potential hazard(s) flagged: ${findingsNow
          .map((f) => f.title)
          .join('; ')}`,
        findings: findingsNow,
        isComplete: true,
      });
    }
  };

  return (
    <div className="flex flex-col h-full justify-between overflow-y-auto pr-1">
      <div className="space-y-4">
        {/* TOP STATUS CARDS (Power Draw & Active Hazards) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
              <Power size={11} className="text-amber-400" />
              <span>Active Power Draw</span>
            </div>
            <div className="text-lg font-bold text-white mt-1 font-mono">
              {totalWatts} <span className="text-xs text-slate-400 font-sans">Watts</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
              <ShieldCheck size={11} className={findings.length > 0 ? 'text-rose-400' : 'text-emerald-400'} />
              <span>Safety Posture</span>
            </div>
            <div className="text-lg font-bold mt-1">
              {findings.length > 0 ? (
                <span className="text-rose-400">{findings.length} Hazard(s)</span>
              ) : (
                <span className="text-emerald-400">100% Safe</span>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE HAZARDS NOTICES */}
        {findings.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
              <AlertTriangle size={13} />
              <span>Active Hazard Telemetry</span>
            </div>
            {findings.map((f) => (
              <div
                key={f.id}
                className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{f.title}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-500/30">
                    {f.severity}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">{f.evidence}</div>
                {f.suggestedFix && (
                  <div className="text-[10px] text-sky-300 mt-1 italic">
                    Fix: {f.suggestedFix}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* LIVE OCCUPANCY BY ROOM */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
            <Users size={13} className="text-sky-400" />
            <span>Room Occupancy Engine</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {rooms.map((room) => {
              const occupants = people.filter((p) => p.currentRoom === room.id);
              const roomDevices = devices.filter((d) => d.room === room.id);
              const activeCount = roomDevices.filter((d) => d.state.power === 'on').length;

              return (
                <div
                  key={`room_occ_${room.id}`}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: room.color }}
                    />
                    <span className="font-semibold text-white">{room.name}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="text-slate-400 font-mono">
                      {activeCount} active load{activeCount !== 1 ? 's' : ''}
                    </span>
                    {occupants.length > 0 ? (
                      <div className="flex items-center space-x-1">
                        {occupants.map((occ) => (
                          <span
                            key={occ.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow"
                            style={{ backgroundColor: occ.color }}
                          >
                            {occ.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[10px] uppercase font-mono">
                        Vacant
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CHECK SAFETY ACTION BUTTON */}
      <div className="pt-3 border-t border-white/10 mt-3">
        <button
          onClick={handleRunSafetyCheck}
          className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition flex items-center justify-center space-x-2"
        >
          <RefreshCw size={14} />
          <span>Run Home Safety Telemetry Audit</span>
        </button>
      </div>
    </div>
  );
};
