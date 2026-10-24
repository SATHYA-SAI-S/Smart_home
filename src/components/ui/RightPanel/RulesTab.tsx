import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Brain, 
  Check, 
  X, 
  SlidersHorizontal, 
  Plus, 
  Cpu, 
  ToggleLeft, 
  ToggleRight 
} from 'lucide-react';
import { useAgentStore } from '../../../store/useAgentStore';
import { useWorldStore } from '../../../store/useWorldStore';
import { CriticalityTier } from '../../../types/world';

export const RulesTab: React.FC = () => {
  const rules = useAgentStore((state) => state.rules);
  const toggleRule = useAgentStore((state) => state.toggleRule);
  const updateRuleSeverity = useAgentStore((state) => state.updateRuleSeverity);
  const preferences = useAgentStore((state) => state.preferences);
  const acceptPreference = useAgentStore((state) => state.acceptPreference);
  const dismissPreference = useAgentStore((state) => state.dismissPreference);

  const devices = useWorldStore((state) => state.devices);
  const updateDeviceCriticality = useWorldStore((state) => state.updateDeviceCriticality);

  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'criticality' | 'memory'>('rules');

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      {/* SUB-TABS */}
      <div className="flex items-center space-x-1 p-1 bg-slate-900/60 rounded-xl border border-white/5 mb-3 text-xs">
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
            activeSubTab === 'rules'
              ? 'bg-sky-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Safety Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveSubTab('criticality')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
            activeSubTab === 'criticality'
              ? 'bg-sky-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Device Tiers
        </button>
        <button
          onClick={() => setActiveSubTab('memory')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
            activeSubTab === 'memory'
              ? 'bg-sky-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Learned ({preferences.filter((p) => p.status === 'pending').length})
        </button>
      </div>

      {/* SUB-TAB 1: DECLARATIVE RULES */}
      {activeSubTab === 'rules' && (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-3 rounded-xl border transition text-xs ${
                rule.enabled
                  ? 'bg-slate-900/70 border-white/10'
                  : 'bg-slate-950/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="font-bold text-white flex items-center space-x-2">
                    <span>{rule.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    {rule.description}
                  </div>
                </div>

                {/* Enable / Disable Toggle */}
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`p-1 rounded-lg transition ${
                    rule.enabled ? 'text-sky-400 hover:text-sky-300' : 'text-slate-600 hover:text-slate-400'
                  }`}
                  title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                >
                  {rule.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>

              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Severity Level:</span>
                <select
                  value={rule.severity}
                  onChange={(e) => updateRuleSeverity(rule.id, e.target.value)}
                  className="bg-slate-800 text-sky-300 text-[10px] font-bold rounded px-2 py-0.5 border border-slate-700"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 2: DEVICE CRITICALITY TIERS */}
      {activeSubTab === 'criticality' && (
        <div className="space-y-2">
          <div className="text-[11px] text-slate-400 mb-2">
            Devices tagged as <strong className="text-rose-400">ESSENTIAL</strong> will NEVER have power cut, even if requested by user commands.
          </div>
          {devices.map((dev) => (
            <div
              key={`tier_${dev.id}`}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-white">{dev.name}</div>
                <div className="text-[10px] text-slate-400">
                  {dev.room} • {dev.type}
                </div>
              </div>

              <select
                value={dev.criticality}
                onChange={(e) => updateDeviceCriticality(dev.id, e.target.value as CriticalityTier)}
                className={`text-[10px] font-bold rounded px-2 py-1 border cursor-pointer ${
                  dev.criticality === 'ESSENTIAL'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : dev.criticality === 'SAFETY'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : dev.criticality === 'SECURITY'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <option value="ESSENTIAL">ESSENTIAL</option>
                <option value="SAFETY">SAFETY</option>
                <option value="SECURITY">SECURITY</option>
                <option value="COMFORT">COMFORT</option>
                <option value="ENERGY">ENERGY</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: LEARNED PREFERENCES & ADAPTATION */}
      {activeSubTab === 'memory' && (
        <div className="space-y-3">
          <div className="text-[11px] text-slate-400">
            SentinelHome observes simulation trends and proposes proactive safety rules for approval:
          </div>

          {preferences.map((pref) => (
            <div
              key={pref.id}
              className="p-3 rounded-xl bg-slate-900/70 border border-indigo-500/30 text-xs"
            >
              <div className="flex items-center space-x-1.5 text-indigo-400 font-bold mb-1">
                <Brain size={14} />
                <span>Learned Pattern (Count: {pref.evidenceCount})</span>
              </div>
              <div className="text-white text-xs mb-2 leading-relaxed">{pref.description}</div>

              {pref.status === 'pending' ? (
                <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => acceptPreference(pref.id)}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs transition flex items-center justify-center space-x-1"
                  >
                    <Check size={13} />
                    <span>Accept as Permanent Rule</span>
                  </button>
                  <button
                    onClick={() => dismissPreference(pref.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                  <Check size={12} />
                  <span>Rule Accepted & Active</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
