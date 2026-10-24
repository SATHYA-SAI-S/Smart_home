import { 
  RiskFinding, 
  DamageReport, 
  HazardProbability 
} from '../types/agent';
import { PersonEntity } from '../types/world';
import { ProbabilityConfig } from '../config/SentinelConfig';

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
export function createPRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEVERITY_WEIGHTS: Record<string, number> = {
  INFO: 0.1,
  LOW: 0.5,
  MEDIUM: 1.5,
  HIGH: 3.5,
  CRITICAL: 8.0,
};

export class DamageModel {
  /**
   * Computes the individual hazard damage probability:
   * p_i = 1 - exp(-baseLambda * L * V * (1 + exposureScale * t_hours))
   *
   * Properties:
   * - Strictly bounded in [0, 1)
   * - Strictly monotonic increasing in exposure time (t_hours)
   * - Strictly monotonic increasing in occupant vulnerability (V)
   * - Strictly monotonic increasing in hazard likelihood (L)
   */
  static computeHazardProbability(
    finding: RiskFinding,
    maxVulnerability: number = 0.5,
    exposureHours: number = 1.0,
    baseLambda: number = ProbabilityConfig.baseLambda,
    exposureScale: number = ProbabilityConfig.exposureScalePerHour
  ): number {
    // Likelihood factor L normalized from finding score or severity
    let likelihood = 0.5;
    if (finding.severity === 'CRITICAL') likelihood = 0.95;
    else if (finding.severity === 'HIGH') likelihood = 0.80;
    else if (finding.severity === 'MEDIUM') likelihood = 0.55;
    else if (finding.severity === 'LOW') likelihood = 0.30;
    else likelihood = 0.10;

    const V = Math.max(0.1, Math.min(1.0, maxVulnerability));
    const E = 1.0 + exposureScale * Math.max(0, exposureHours);
    const exponent = -1.0 * baseLambda * likelihood * V * E;

    // Guaranteed finite and bounded in [0, 1]
    const p = 1.0 - Math.exp(exponent);
    return Math.max(0.0, Math.min(0.9999, p));
  }

  /**
   * Computes the derived model-based damage report for a set of findings.
   * Calculates nominal probabilities, total expected harm, and seeded Monte Carlo intervals.
   */
  static assessDamage(
    findings: RiskFinding[],
    people: PersonEntity[] = [],
    exposureHours: number = 1.0,
    monteCarloSamples: number = ProbabilityConfig.monteCarloSamples,
    seed: number = ProbabilityConfig.defaultSeed
  ): DamageReport {
    if (findings.length === 0) {
      return {
        hazardProbabilities: [],
        nominalProbabilityAnyHarm: 0.0,
        totalExpectedHarm: 0.0,
        monteCarlo: {
          samples: monteCarloSamples,
          seed,
          mean: 0.0,
          ci90Lower: 0.0,
          ci90Upper: 0.0,
        },
        disclaimer: 'model-based estimate, not empirically calibrated',
      };
    }

    // Maximum vulnerability among inhabitants (default 0.5 if none present)
    const maxVulnerability = people.length > 0 
      ? Math.max(...people.map((p) => p.attributes?.vulnerability ?? 0.5))
      : 0.5;

    // 1. Calculate nominal probability and expected harm per hazard
    let productComplement = 1.0;
    let totalExpectedHarm = 0.0;
    const hazardProbabilities: HazardProbability[] = [];

    for (const finding of findings) {
      const weight = SEVERITY_WEIGHTS[finding.severity] || 1.0;
      const p_i = this.computeHazardProbability(finding, maxVulnerability, exposureHours);
      const expectedHarm_i = p_i * weight;

      hazardProbabilities.push({
        hazardId: finding.id,
        title: finding.title,
        severity: finding.severity,
        severityWeight: weight,
        nominalProbability: parseFloat(p_i.toFixed(4)),
        expectedHarm: parseFloat(expectedHarm_i.toFixed(3)),
        exposureHours,
      });

      productComplement *= 1.0 - p_i;
      totalExpectedHarm += expectedHarm_i;
    }

    // Combined P(any harm) = 1 - prod(1 - p_i)
    const nominalProbabilityAnyHarm = Math.max(0.0, Math.min(1.0, 1.0 - productComplement));

    // 2. Deterministic Monte Carlo simulation
    const rng = createPRNG(seed);
    const mcTrials: number[] = [];

    for (let s = 0; s < monteCarloSamples; s++) {
      let trialProductComplement = 1.0;

      for (const finding of findings) {
        // Perturb vulnerability by +/- 15%
        const perturbedV = Math.max(0.1, Math.min(1.0, maxVulnerability + (rng() * 0.3 - 0.15)));
        // Perturb exposure duration by +/- 20%
        const perturbedHours = Math.max(0.1, exposureHours * (1.0 + (rng() * 0.4 - 0.2)));

        const p_sample = this.computeHazardProbability(
          finding,
          perturbedV,
          perturbedHours,
          ProbabilityConfig.baseLambda,
          ProbabilityConfig.exposureScalePerHour
        );

        trialProductComplement *= 1.0 - p_sample;
      }

      mcTrials.push(1.0 - trialProductComplement);
    }

    // Sort to extract percentiles
    mcTrials.sort((a, b) => a - b);
    const mean = mcTrials.reduce((sum, v) => sum + v, 0) / mcTrials.length;
    const lowerIdx = Math.floor(mcTrials.length * 0.05);
    const upperIdx = Math.min(mcTrials.length - 1, Math.floor(mcTrials.length * 0.95));

    return {
      hazardProbabilities,
      nominalProbabilityAnyHarm: parseFloat(nominalProbabilityAnyHarm.toFixed(4)),
      totalExpectedHarm: parseFloat(totalExpectedHarm.toFixed(3)),
      monteCarlo: {
        samples: monteCarloSamples,
        seed,
        mean: parseFloat(mean.toFixed(4)),
        ci90Lower: parseFloat(mcTrials[lowerIdx].toFixed(4)),
        ci90Upper: parseFloat(mcTrials[upperIdx].toFixed(4)),
      },
      disclaimer: 'model-based estimate, not empirically calibrated',
    };
  }
}
