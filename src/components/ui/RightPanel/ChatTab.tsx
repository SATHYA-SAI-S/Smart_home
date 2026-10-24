import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp,
  Zap
} from 'lucide-react';
import { useAgentStore } from '../../../store/useAgentStore';
import { useWorldStore } from '../../../store/useWorldStore';
import { AgentOrchestrator } from '../../../agent/AgentOrchestrator';
import { AutonomyLevel } from '../../../types/agent';

export const ChatTab: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState<{ [msgId: string]: boolean }>({});

  const messages = useAgentStore((state) => state.messages);
  const currentSpeaker = useAgentStore((state) => state.currentSpeaker);
  const setSpeaker = useAgentStore((state) => state.setSpeaker);
  const autonomyLevel = useAgentStore((state) => state.autonomyLevel);
  const setAutonomyLevel = useAgentStore((state) => state.setAutonomyLevel);
  const setActiveTab = useAgentStore((state) => state.setActiveTab);
  const people = useWorldStore((state) => state.people);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;
    setInputText('');
    await AgentOrchestrator.runPipeline(text, currentSpeaker);
  };

  const toggleStages = (msgId: string) => {
    setCollapsedStages((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Quick scenario presets
  const presets = [
    { label: "I'm leaving home", prompt: "I'm leaving home, make sure everything is safe." },
    { label: "Goodnight", prompt: "Goodnight, lock the doors and turn off living room appliances." },
    { label: "Make it cozy", prompt: "Make it cozy in the hall for movie night." },
    { label: "I'm cooking", prompt: "I'm cooking dinner, keep the kitchen lights and stove ready." },
    { label: "Grandpa's power", prompt: "Turn off what Grandpa isn't using right now." },
    { label: "Filter pool", prompt: "Turn on the pool filter." },
    { label: "Check home safety", prompt: "Is everything safe in the house right now?" },
    { label: "Lock all doors", prompt: "Lock all doors and perimeter gates." },
  ];

  return (
    <div className="flex flex-col h-full justify-between">
      {/* CONTROLS HEADER (Speaker & Autonomy Level) */}
      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 mb-3 flex items-center justify-between space-x-2 text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 font-medium">Speaking as:</span>
          <select
            value={currentSpeaker}
            onChange={(e) => setSpeaker(e.target.value)}
            className="bg-slate-800 text-sky-400 font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {people.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} ({p.attributes.ageGroup})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 font-medium">Autonomy:</span>
          <select
            value={autonomyLevel}
            onChange={(e) => setAutonomyLevel(e.target.value as AutonomyLevel)}
            className="bg-slate-800 text-indigo-300 font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ask_always">Ask Always</option>
            <option value="ask_on_risk">Ask on Risk</option>
            <option value="auto_safe">Auto Safe</option>
          </select>
        </div>
      </div>

      {/* QUICK SCENARIO CHIPS */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {presets.map((preset, idx) => (
          <button
            key={`preset_${idx}`}
            onClick={() => handleSend(preset.prompt)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/5 hover:border-sky-500/30 text-[11px] font-medium transition flex items-center space-x-1"
          >
            <Sparkles size={11} className="text-sky-400" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* MESSAGE STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isCollapsed = collapsedStages[msg.id];

          return (
            <div
              key={msg.id}
              className={`p-3 rounded-2xl text-xs ${
                isUser
                  ? 'bg-sky-600/20 border border-sky-500/30 ml-8 text-sky-100'
                  : 'bg-slate-900/70 border border-white/10 mr-4 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span className="font-bold text-sky-300">
                  {isUser ? msg.speaker || 'User' : 'SentinelHome Agent'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="text-slate-100 text-xs mb-2 leading-relaxed">{msg.text}</div>

              {/* 6-STAGE REASONING STEPPER */}
              {msg.stageStatuses && msg.stageStatuses.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div
                    onClick={() => toggleStages(msg.id)}
                    className="flex items-center justify-between text-[11px] font-semibold text-slate-300 cursor-pointer hover:text-white mb-2"
                  >
                    <span className="flex items-center space-x-1">
                      <Zap size={12} className="text-sky-400" />
                      <span>Reasoning & Verification Stepper</span>
                    </span>
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-1.5 pl-1">
                      {msg.stageStatuses.map((st, i) => {
                        let statusIcon = <Clock size={12} className="text-slate-500" />;
                        let badgeClass = 'text-slate-400 bg-slate-800/60';

                        if (st.status === 'running') {
                          statusIcon = <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />;
                          badgeClass = 'text-sky-300 bg-sky-500/20 border border-sky-500/30';
                        } else if (st.status === 'done') {
                          statusIcon = <CheckCircle2 size={13} className="text-emerald-400" />;
                          badgeClass = 'text-emerald-300 bg-emerald-500/20';
                        } else if (st.status === 'blocked') {
                          statusIcon = <ShieldAlert size={13} className="text-rose-400" />;
                          badgeClass = 'text-rose-300 bg-rose-500/20 font-bold';
                        } else if (st.status === 'error') {
                          statusIcon = <AlertTriangle size={13} className="text-amber-400" />;
                          badgeClass = 'text-amber-300 bg-amber-500/20';
                        }

                        return (
                          <div
                            key={`stage_${msg.id}_${i}`}
                            className={`p-2 rounded-xl text-[11px] flex items-start space-x-2 border border-white/5 ${badgeClass}`}
                          >
                            <div className="mt-0.5">{statusIcon}</div>
                            <div className="flex-1">
                              <div className="font-semibold">{st.label}</div>
                              {st.detail && (
                                <div className="text-[10px] text-slate-300 mt-0.5 opacity-90">
                                  {st.detail}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* PROMPT TO VIEW PLAN IN TAB 2 IF BLOCKED FOR APPROVAL */}
                  {msg.stageStatuses.some((s) => s.status === 'blocked') && (
                    <div className="mt-3">
                      <button
                        onClick={() => setActiveTab('plan')}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition flex items-center justify-center space-x-1.5"
                      >
                        <span>Review Plan & Grant Approval in Tab 2</span>
                        <ChevronDown size={14} className="-rotate-90" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT COMMAND BAR */}
      <div className="pt-3 border-t border-white/10 mt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Give a command (e.g. 'I am leaving home', 'make it cozy')..."
              className="w-full bg-slate-900/90 text-xs text-white placeholder-slate-400 rounded-xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-sky-400 transition pr-9"
            />
            {/* Mic / Simulated Voice Button */}
            <button
              type="button"
              onClick={() => {
                setIsListening(!isListening);
                if (!isListening) {
                  setInputText("I'm leaving home, make sure everything is safe.");
                }
              }}
              className={`absolute right-2 top-2 p-1 rounded-lg transition ${
                isListening ? 'text-rose-400 animate-pulse' : 'text-slate-400 hover:text-white'
              }`}
              title="Voice Input Simulation"
            >
              {isListening ? <Mic size={15} /> : <MicOff size={15} />}
            </button>
          </div>

          <button
            type="submit"
            className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition shadow-md shadow-sky-500/30 flex items-center justify-center shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
