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
  riskSeverity?: 'NONE' | 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
    | 'safety_sensor_protection'
    | 'heating_unattended'
    | 'gas_safety'
    | 'emergency_egress'
    | 'pet_protection'
    | 'sleep_egress_lighting'
    | 'perimeter_open'
    | 'camera_privacy'
    | 'hazard_swimmer_filtration'
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

export interface PreviewToken {
  id: string;
  planHash: string;
  stateHash: string;
  relevantDeviceIds: string[];
  relevantRooms: string[];
  createdAt: number;
  expiresAt: number;
  signature?: string;
}

export interface StateDriftDiff {
  entityType: 'room_occupancy' | 'device_state' | 'door_state';
  entityId: string;
  entityName: string;
  property: string;
  previewValue: any;
  currentValue: any;
  explanation: string;
}

export type CommitStatus = 'COMMITTED' | 'DRIFTED' | 'EXPIRED' | 'INVALID_TOKEN' | 'BLOCKED_INVARIANT';

export interface CommitResult {
  status: CommitStatus;
  success: boolean;
  executedSteps?: PlanStep[];
  driftDiff?: StateDriftDiff[];
  message: string;
  newToken?: PreviewToken;
}

export interface PreviewResult {
  plan: PlanStep[];
  diff: SimulationDiffItem[];
  findings: RiskFinding[];
  token: PreviewToken;
  intent: Intent;
}

export interface ThresholdCrossing {
  hazardType: string;
  thresholdName: string;
  firstCrossingMinutes: number | null;
  details: string;
  mitigationAvailable: boolean;
}

export interface TimelineCheckpoint {
  timeMinutes: number;
  label: string; // e.g. "Now (0m)", "+5m", "+1h", "+8h"
  simulatedDevices: any[];
  simulatedDoors: any[];
  findings: RiskFinding[];
  environmentalValues: {
    fridgeTempC?: number;
    roomTempsC?: Record<string, number>;
    stoveUnattendedMinutes?: number;
    medicalBatteryPercent?: number;
  };
  timeOnlyHazards: string[];
}

export interface TimeSimulationResult {
  checkpoints: TimelineCheckpoint[];
  thresholdCrossings: ThresholdCrossing[];
  timeOnlyCatches: string[];
}

export interface HazardProbability {
  hazardId: string;
  title: string;
  severity: string;
  severityWeight: number;
  nominalProbability: number;
  expectedHarm: number;
  exposureHours: number;
}

export interface DamageReport {
  hazardProbabilities: HazardProbability[];
  nominalProbabilityAnyHarm: number;
  totalExpectedHarm: number;
  monteCarlo: {
    samples: number;
    seed: number;
    mean: number;
    ci90Lower: number;
    ci90Upper: number;
  };
  disclaimer: 'model-based estimate, not empirically calibrated';
}

