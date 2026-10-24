/**
 * SentinelHome System Configuration
 * Strongly typed configuration objects with units, assumptions, and validation defaults.
 */

export interface TokenConfigType {
  /** Lifetime of preview tokens in milliseconds before expiration (default: 60,000 ms = 60s) */
  lifetimeMs: number;
  /** Cryptographic or hashing salt identifier */
  tokenVersion: string;
}

export const TokenConfig: TokenConfigType = {
  lifetimeMs: 60 * 1000, // 60 seconds
  tokenVersion: 'v1.0.0',
};

export interface SimulationConfigType {
  /** Checkpoints relative to current time in minutes: +5m, +1h (60m), +8h (480m) */
  checkpointsMinutes: number[];
  /** Discrete simulation tick interval in minutes */
  tickIntervalMinutes: number;
}

export const SimulationConfig: SimulationConfigType = {
  checkpointsMinutes: [5, 60, 480],
  tickIntervalMinutes: 1,
};

export interface HazardConfigType {
  fridge: {
    ambientTempC: number;
    /** Cooling off thermal conductance factor k in dT/dt = k*(T_amb - T) per hour */
    decayConstantPerHour: number;
    /** Safe spoilage threshold in Celsius */
    spoilageTempThresholdC: number;
    /** Severe danger / bacterial proliferation threshold in Celsius */
    dangerTempThresholdC: number;
  };
  stove: {
    /** Fire hazard score accumulation per unattended minute in empty kitchen */
    riskAccumulationPerMinute: number;
    /** Unattended minutes before critical fire hazard threshold */
    criticalUnattendedMinutes: number;
  };
  climate: {
    /** Baseline ambient outdoor temperature */
    ambientOutdoorTempC: number;
    /** Rate of room temperature rise or drop toward outdoor temperature per hour without AC/Heating */
    driftRatePerHour: number;
    /** Heat stress threshold for vulnerable occupants (elderly, infants, pets) in Celsius */
    vulnerableHeatStressThresholdC: number;
    /** Hypothermia threshold in Celsius */
    vulnerableColdStressThresholdC: number;
  };
  medical: {
    /** Battery reserve duration for unpowered medical devices in minutes */
    batteryReserveMinutes: number;
  };
  pool: {
    /** Hazard severity if filter suction is engaged while swimmer is in pool */
    suctionHazardSeverity: number;
  };
  perimeter: {
    /** Night start hour in 24h format (e.g. 21.0 = 9:00 PM) */
    nightStartHour: number;
    /** Night end hour in 24h format (e.g. 6.0 = 6:00 AM) */
    nightEndHour: number;
  };
}

export const HazardConfig: HazardConfigType = {
  fridge: {
    ambientTempC: 24.0,
    decayConstantPerHour: 0.18,
    spoilageTempThresholdC: 4.0,
    dangerTempThresholdC: 10.0,
  },
  stove: {
    riskAccumulationPerMinute: 0.08,
    criticalUnattendedMinutes: 10,
  },
  climate: {
    ambientOutdoorTempC: 34.0,
    driftRatePerHour: 1.5,
    vulnerableHeatStressThresholdC: 30.0,
    vulnerableColdStressThresholdC: 17.0,
  },
  medical: {
    batteryReserveMinutes: 30,
  },
  pool: {
    suctionHazardSeverity: 1.0,
  },
  perimeter: {
    nightStartHour: 21.0,
    nightEndHour: 6.0,
  },
};

export interface ProbabilityConfigType {
  /** Baseline hazard likelihood coefficient lambda */
  baseLambda: number;
  /** Exposure time scaling factor (per hour) */
  exposureScalePerHour: number;
  /** Monte Carlo sample iterations (default: 500) */
  monteCarloSamples: number;
  /** Default deterministic PRNG seed for reproducible benchmarks */
  defaultSeed: number;
  /** Confidence interval coverage fraction (e.g. 0.90 for 90% CI) */
  confidenceInterval: number;
}

export const ProbabilityConfig: ProbabilityConfigType = {
  baseLambda: 0.45,
  exposureScalePerHour: 0.35,
  monteCarloSamples: 500,
  defaultSeed: 1337,
  confidenceInterval: 0.90,
};

export interface EvalConfigType {
  /** Timeout per evaluation scenario in milliseconds */
  scenarioTimeoutMs: number;
  /** Latency p95 maximum SLA in milliseconds */
  maxP95LatencyMs: number;
}

export const EvalConfig: EvalConfigType = {
  scenarioTimeoutMs: 5000,
  maxP95LatencyMs: 3500,
};
