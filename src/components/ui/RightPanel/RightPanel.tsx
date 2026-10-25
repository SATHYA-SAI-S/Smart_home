import React, { useState } from 'react';
import { 
  MessageSquare, 
  FileCheck2, 
  Globe, 
  ShieldCheck, 
  History, 
  ChevronRight, 
  ChevronLeft,
  BarChart3
} from 'lucide-react';
import { useAgentStore } from '../../../store/useAgentStore';
import { ChatTab } from './ChatTab';
import { PlanTab } from './PlanTab';
import { WorldTab } from './WorldTab';
import { RulesTab } from './RulesTab';
import { AuditTab } from './AuditTab';
import { EvalTab } from './EvalTab';

export const RightPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const activeTab = useAgentStore((state) => state.activeTab);
  const setActiveTab = useAgentStore((state) => state.setActiveTab);
  const currentPlan = useAgentStore((state) => state.currentPlan);
  const pendingApprovalsCount = currentPlan.filter((s) => s.approved && !s.isBlockedByInvariant).length;

  const tabs: { id: typeof activeTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
    { id: 'plan', label: 'Plan & Approvals', icon: <FileCheck2 size={13} />, badge: pendingApprovalsCount },
    { id: 'world', label: 'World & Risks', icon: <Globe size={13} /> },
    { id: 'rules', label: 'Rules', icon: <ShieldCheck size={13} /> },
    { id: 'audit', label: 'Audit', icon: <History size={13} /> },
    { id: 'eval', label: 'Eval', icon: <BarChart3 size={13} /> },
  ];

  return (
    <div
      className={`absolute right-4 top-16 bottom-24 z-20 transition-all duration-300 flex pointer-events-auto ${
        collapsed ? 'translate-x-[calc(100%-14px)]' : 'translate-x-0'
      }`}
    >
      {/* COLLAPSE / EXPAND TOGGLE TAB */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-5 h-12 my-auto -ml-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white rounded-l-xl border-y border-l border-white/15 flex items-center justify-center transition shadow-xl"
        title={collapsed ? 'Expand AI Assistant Panel' : 'Collapse Panel'}
      >
        {collapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      <div className="glass-panel w-96 rounded-2xl p-4 flex flex-col justify-between shadow-2xl border border-white/10">
        {/* TAB NAVIGATION HEADER */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900/70 rounded-xl border border-white/5 mb-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center space-x-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={tab.label}
              >
                {tab.icon}
                <span className="hidden sm:inline text-[11px]">{tab.label.split(' ')[0]}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center shadow">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ACTIVE TAB CONTENT */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'plan' && <PlanTab />}
          {activeTab === 'world' && <WorldTab />}
          {activeTab === 'rules' && <RulesTab />}
          {activeTab === 'audit' && <AuditTab />}
          {activeTab === 'eval' && <EvalTab />}
        </div>
      </div>
    </div>
  );
};
