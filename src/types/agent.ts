import { DeviceState } from './world';

export type AutonomyLevel = 'ask_always' | 'ask_on_risk' | 'auto_safe';

export type AgentStage = 
  | 'idle' 
  | 'understanding' 
  | 'simulating' 
  | 'analyzing' 
  | 'recommending' 
  | 'confirming' 
  | 'executing' 
  | 'verifying' 
  | 'completed' 
  | 'blocked';

export interface StageStatus {
  stage: AgentStage;
  status: 'pending' | 'running' | 'done' | 'blocked' | 'error';
  label: string;
  detail?: string;
}

export interface Intent {
  goal: string;
  scope: string; // 'all', 'kitchen', 'doors', etc.
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';
  speaker: string;
  constraints: string[];
  confidence: number;
  ambiguities: string[];
  rawUnderstanding?: string;
}

export interface PlanStep {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  room: string;
  action: string; // e.g. "set_power", "set_locked"
  targetState: Partial<DeviceState>;
  currentState: Partial<DeviceState>;
  reason: string;
  isEssential: boolean;
  isBlockedByInvariant?: boolean;
  invariantViolationMessage?: string;
  riskSeverity?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  approved?: boolean;
}

export interface SimulationDiffItem {
  deviceId: string;
  deviceName: string;
  room: string;
  property: string;
  before: any;
  after: any;
  cascadingEffect?: string;
  hazardCreated?: string;
}

export interface RiskFinding {
  id: string;
  ruleId: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  explanation: string;
  evidence: string;
  suggestedFix?: string;
  affectedPeople?: string[];
  affectedDevices?: string[];
  score: number;
}

export interface HardInvariant {
  id: string;
  name: string;
  description: string;
  check: (beforeState: any, candidateStep: PlanStep, worldState: any) => { violated: boolean; reason?: string };
}

export interface DeclarativeRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  conditionType: 
    | 'occupancy_conflict' 
    | 'essential_dependency' 
    | 'hazard_unattended' 
    | 'perimeter_exposure' 
    | 'vulnerable_occupant' 
    | 'energy_waste' 
    | 'custom';
  parameters?: Record<string, any>;
  explanation: string;
  suggestedFix: string;
}

export interface PlanAlternative {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  riskScore: number;
}

export interface PlanRecommendation {
  primaryPlan: PlanStep[];
  alternatives: PlanAlternative[];
  clarificationQuestion?: string;
  summaryExplanation: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  command: string;
  speaker: string;
  intent: Intent;
  simulatedDiff: SimulationDiffItem[];
  findings: RiskFinding[];
  executedSteps: PlanStep[];
  verificationResult: {
    success: boolean;
    mismatches: string[];
  };
  reverted?: boolean;
}

export interface LearnedPreference {
  id: string;
  description: string;
  evidenceCount: number;
  proposedRule: DeclarativeRule;
  status: 'pending' | 'accepted' | 'dismissed';
}
