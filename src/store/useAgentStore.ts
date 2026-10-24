import { create } from 'zustand';
import { 
  Intent, 
  PlanStep, 
  RiskFinding, 
  SimulationDiffItem, 
  AuditLogItem, 
  AutonomyLevel, 
  StageStatus, 
  DeclarativeRule, 
  LearnedPreference,
  PlanRecommendation,
  PreviewToken,
  StateDriftDiff,
  TimeSimulationResult
} from '../types/agent';
import { INITIAL_RULES } from '../data/initialWorld';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  speaker?: string;
  text: string;
  timestamp: string;
  stageStatuses?: StageStatus[];
  planRecommendation?: PlanRecommendation;
  findings?: RiskFinding[];
  isComplete?: boolean;
}

interface AgentStoreState {
  messages: ChatMessage[];
  currentInput: string;
  currentSpeaker: string;
  autonomyLevel: AutonomyLevel;
  activeTab: 'chat' | 'plan' | 'world' | 'rules' | 'audit' | 'eval';
  
  // Pipeline live state
  currentIntent: Intent | null;
  currentPlan: PlanStep[];
  currentDiff: SimulationDiffItem[];
  currentFindings: RiskFinding[];
  currentRecommendation: PlanRecommendation | null;
  stageStatuses: StageStatus[];
  isProcessing: boolean;

  // C1 State-aware Preview/Commit Token and Drift
  activeToken: PreviewToken | null;
  driftDiff: StateDriftDiff[] | null;

  // C2 Time-aware Simulation & Timeline
  timeSimulation: TimeSimulationResult | null;
  selectedTimelineMinutes: number;
  
  // Rules and preferences
  rules: DeclarativeRule[];
  preferences: LearnedPreference[];
  auditLogs: AuditLogItem[];
  undoStack: AuditLogItem[];

  // Actions
  setInput: (input: string) => void;
  setSpeaker: (speaker: string) => void;
  setAutonomyLevel: (level: AutonomyLevel) => void;
  setActiveTab: (tab: 'chat' | 'plan' | 'world' | 'rules' | 'audit' | 'eval') => void;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessageStages: (messageId: string, stages: StageStatus[], isComplete?: boolean) => void;
  updateMessageRecommendation: (messageId: string, recommendation: PlanRecommendation, findings: RiskFinding[]) => void;
  
  setPipelineStages: (stages: StageStatus[]) => void;
  updateStage: (stageIndex: number, status: StageStatus['status'], detail?: string) => void;
  
  toggleStepApproval: (stepId: string) => void;
  approveAllSteps: () => void;
  rejectAllSteps: () => void;
  
  setActiveToken: (token: PreviewToken | null) => void;
  setDriftDiff: (diffs: StateDriftDiff[] | null) => void;
  clearDrift: () => void;

  setTimeSimulation: (res: TimeSimulationResult | null) => void;
  setSelectedTimelineMinutes: (min: number) => void;

  // Rules actions
  toggleRule: (ruleId: string) => void;
  updateRuleSeverity: (ruleId: string, severity: any) => void;
  addRule: (rule: DeclarativeRule) => void;
  acceptPreference: (prefId: string) => void;
  dismissPreference: (prefId: string) => void;
  
  // Audit & Undo
  addAuditLog: (log: AuditLogItem) => void;
  popUndo: () => AuditLogItem | undefined;
  clearPipeline: () => void;
}

const DEFAULT_STAGES: StageStatus[] = [
  { stage: 'understanding', status: 'pending', label: '1. Understand Intent' },
  { stage: 'simulating', status: 'pending', label: '2. Simulate Sandbox' },
  { stage: 'analyzing', status: 'pending', label: '3. Risk & Invariant Check' },
  { stage: 'recommending', status: 'pending', label: '4. Recommend Safe Plan' },
  { stage: 'confirming', status: 'pending', label: '5. Confirmation Gate' },
  { stage: 'executing', status: 'pending', label: '6. Execute & Verify' },
];

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  messages: [
    {
      id: 'welcome_msg',
      sender: 'agent',
      text: 'SentinelHome Safety Engine initialized. I am your autonomous contextual protector. Speak or type commands, or test any scenario from the presets.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isComplete: true,
    },
  ],
  currentInput: '',
  currentSpeaker: 'You',
  autonomyLevel: 'ask_on_risk',
  activeTab: 'chat',

  currentIntent: null,
  currentPlan: [],
  currentDiff: [],
  currentFindings: [],
  currentRecommendation: null,
  stageStatuses: DEFAULT_STAGES,
  isProcessing: false,

  activeToken: null,
  driftDiff: null,

  timeSimulation: null,
  selectedTimelineMinutes: 0,

  rules: INITIAL_RULES,
  preferences: [
    {
      id: 'pref_grandpa_nightlight',
      description: 'Keep hall nightlight active when Grandpa is in the living room after dusk.',
      evidenceCount: 3,
      proposedRule: {
        id: 'rule_learned_grandpa_light',
        name: 'Grandpa Hall Nightlight Preservation',
        description: 'Retain soft lighting in hall if Grandpa is awake at night.',
        enabled: true,
        severity: 'MEDIUM',
        conditionType: 'vulnerable_occupant',
        explanation: 'Avoids total darkness while elderly resident is moving.',
        suggestedFix: 'Dim light to 20% instead of switching completely off.',
      },
      status: 'pending',
    },
  ],
  auditLogs: [],
  undoStack: [],

  setInput: (input) => set({ currentInput: input }),
  setSpeaker: (speaker) => set({ currentSpeaker: speaker }),
  setAutonomyLevel: (level) => set({ autonomyLevel: level }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  addMessage: (msg) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ChatMessage = {
      ...msg,
      id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({ messages: [...state.messages, newMsg] }));
    return id;
  },

  updateMessageStages: (messageId, stages, isComplete = false) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, stageStatuses: stages, isComplete } : m
      ),
      stageStatuses: stages,
    }));
  },

  updateMessageRecommendation: (messageId, recommendation, findings) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, planRecommendation: recommendation, findings }
          : m
      ),
      currentRecommendation: recommendation,
      currentPlan: recommendation.primaryPlan,
      currentFindings: findings,
    }));
  },

  setPipelineStages: (stages) => set({ stageStatuses: stages }),

  updateStage: (stageIndex, status, detail) => {
    set((state) => {
      const updated = [...state.stageStatuses];
      if (updated[stageIndex]) {
        updated[stageIndex] = {
          ...updated[stageIndex],
          status,
          detail: detail !== undefined ? detail : updated[stageIndex].detail,
        };
      }
      return { stageStatuses: updated };
    });
  },

  toggleStepApproval: (stepId) => {
    set((state) => ({
      currentPlan: state.currentPlan.map((s) =>
        s.id === stepId ? { ...s, approved: !s.approved } : s
      ),
    }));
  },

  approveAllSteps: () => {
    set((state) => ({
      currentPlan: state.currentPlan.map((s) =>
        s.isBlockedByInvariant ? s : { ...s, approved: true }
      ),
    }));
  },

  rejectAllSteps: () => {
    set((state) => ({
      currentPlan: state.currentPlan.map((s) => ({ ...s, approved: false })),
    }));
  },

  toggleRule: (ruleId) => {
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  },

  updateRuleSeverity: (ruleId, severity) => {
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === ruleId ? { ...r, severity } : r
      ),
    }));
  },

  addRule: (rule) => {
    set((state) => ({ rules: [...state.rules, rule] }));
  },

  acceptPreference: (prefId) => {
    const pref = get().preferences.find((p) => p.id === prefId);
    if (!pref) return;
    set((state) => ({
      rules: [...state.rules, pref.proposedRule],
      preferences: state.preferences.map((p) =>
        p.id === prefId ? { ...p, status: 'accepted' } : p
      ),
    }));
  },

  dismissPreference: (prefId) => {
    set((state) => ({
      preferences: state.preferences.map((p) =>
        p.id === prefId ? { ...p, status: 'dismissed' } : p
      ),
    }));
  },

  addAuditLog: (log) => {
    set((state) => ({
      auditLogs: [log, ...state.auditLogs],
      undoStack: [log, ...state.undoStack],
    }));
  },

  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return undefined;
    const [latest, ...rest] = stack;
    set({ undoStack: rest });
    return latest;
  },

  setActiveToken: (token) => set({ activeToken: token }),
  setDriftDiff: (diffs) => set({ driftDiff: diffs }),
  clearDrift: () => set({ driftDiff: null }),

  setTimeSimulation: (res) => set({ timeSimulation: res }),
  setSelectedTimelineMinutes: (min) => set({ selectedTimelineMinutes: min }),

  clearPipeline: () => {
    set({
      currentIntent: null,
      currentPlan: [],
      currentDiff: [],
      currentFindings: [],
      currentRecommendation: null,
      activeToken: null,
      driftDiff: null,
      timeSimulation: null,
      selectedTimelineMinutes: 0,
      stageStatuses: DEFAULT_STAGES,
      isProcessing: false,
    });
  },
}));
