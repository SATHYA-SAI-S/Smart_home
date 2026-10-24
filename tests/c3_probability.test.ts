import { describe, it, expect } from 'vitest';
import { DamageModel, SEVERITY_WEIGHTS } from '../src/agent/DamageModel';
import { RiskFinding } from '../src/types/agent';
import { PersonEntity } from '../src/types/world';

describe('C3: Probability of Damage & Monte Carlo Estimation Tests', () => {
  const dummyFinding: RiskFinding = {
    id: 'finding_test_1',
    ruleId: 'rule_stove_unattended',
    severity: 'HIGH',
    title: 'Unattended Stove Cooking',
    explanation: 'Burner energized in empty kitchen',
    evidence: '0 occupants in kitchen',
    score: 2.7,
  };

  const dummyFindingCritical: RiskFinding = {
    id: 'finding_test_2',
    ruleId: 'rule_fridge_power',
    severity: 'CRITICAL',
    title: 'Critical Refrigerator Spoilage',
    explanation: 'Spoilage threshold exceeded',
    evidence: 'Temp > 4°C',
    score: 4.0,
  };

  const adultPerson: PersonEntity = {
    id: 'p1',
    name: 'You',
    color: '#38bdf8',
    attributes: { ageGroup: 'adult', mobility: 'high', vulnerability: 0.2, role: 'owner' },
    position: [0, 0, 0],
    rotationY: 0,
    currentRoom: 'hall',
    activity: 'idle',
    isControlled: false,
  };

  const vulnerablePerson: PersonEntity = {
    id: 'p2',
    name: 'Grandpa',
    color: '#f59e0b',
    attributes: { ageGroup: 'elderly', mobility: 'reduced', vulnerability: 0.9, role: 'resident' },
    position: [0, 0, 0],
    rotationY: 0,
    currentRoom: 'bedroom',
    activity: 'resting',
    isControlled: false,
  };

  it('Requirement C3: Output probabilities are strictly bounded within [0, 1]', () => {
    for (let hours = 0; hours <= 24; hours += 2) {
      for (let vuln = 0.1; vuln <= 1.0; vuln += 0.2) {
        const p = DamageModel.computeHazardProbability(dummyFinding, vuln, hours);
        expect(p).toBeGreaterThanOrEqual(0.0);
        expect(p).toBeLessThanOrEqual(1.0);
      }
    }

    const report = DamageModel.assessDamage([dummyFinding, dummyFindingCritical], [adultPerson, vulnerablePerson], 2.0);
    expect(report.nominalProbabilityAnyHarm).toBeGreaterThanOrEqual(0.0);
    expect(report.nominalProbabilityAnyHarm).toBeLessThanOrEqual(1.0);
    expect(report.monteCarlo.mean).toBeGreaterThanOrEqual(0.0);
    expect(report.monteCarlo.mean).toBeLessThanOrEqual(1.0);
    expect(report.monteCarlo.ci90Lower).toBeLessThanOrEqual(report.monteCarlo.ci90Upper);
  });

  it('Requirement C3: Monotonic in exposure time (longer exposure strictly increases p)', () => {
    const p1 = DamageModel.computeHazardProbability(dummyFinding, 0.5, 0.5); // 30 min
    const p2 = DamageModel.computeHazardProbability(dummyFinding, 0.5, 2.0); // 2 hours
    const p3 = DamageModel.computeHazardProbability(dummyFinding, 0.5, 8.0); // 8 hours

    expect(p1).toBeLessThan(p2);
    expect(p2).toBeLessThan(p3);
  });

  it('Requirement C3: Monotonic in occupant vulnerability (higher vulnerability strictly increases p)', () => {
    const pLow = DamageModel.computeHazardProbability(dummyFinding, 0.2, 1.0); // adult
    const pHigh = DamageModel.computeHazardProbability(dummyFinding, 0.9, 1.0); // vulnerable elder

    expect(pLow).toBeLessThan(pHigh);
  });

  it('Requirement C3: Safe plan damage probability <= Literal plan damage probability', () => {
    // Literal unmitigated plan has critical findings
    const literalReport = DamageModel.assessDamage(
      [dummyFinding, dummyFindingCritical],
      [vulnerablePerson],
      2.0
    );

    // Safe repaired plan eliminates or downgrades findings
    const safeReport = DamageModel.assessDamage(
      [], // Recommender repaired all violations
      [vulnerablePerson],
      2.0
    );

    expect(safeReport.nominalProbabilityAnyHarm).toBeLessThanOrEqual(literalReport.nominalProbabilityAnyHarm);
    expect(safeReport.totalExpectedHarm).toBeLessThanOrEqual(literalReport.totalExpectedHarm);
  });

  it('Requirement C3: Deterministic Monte Carlo output (same seed gives identical intervals)', () => {
    const seed = 9999;
    const reportA = DamageModel.assessDamage([dummyFinding], [vulnerablePerson], 1.0, 500, seed);
    const reportB = DamageModel.assessDamage([dummyFinding], [vulnerablePerson], 1.0, 500, seed);

    expect(reportA.monteCarlo.mean).toBe(reportB.monteCarlo.mean);
    expect(reportA.monteCarlo.ci90Lower).toBe(reportB.monteCarlo.ci90Lower);
    expect(reportA.monteCarlo.ci90Upper).toBe(reportB.monteCarlo.ci90Upper);
    expect(reportA.monteCarlo.samples).toBe(500);
  });

  it('Requirement C3: Expected harm = probability x severity weight', () => {
    const report = DamageModel.assessDamage([dummyFinding], [adultPerson], 1.0);
    const hp = report.hazardProbabilities[0];
    const expectedWeight = SEVERITY_WEIGHTS[dummyFinding.severity];

    expect(hp.severityWeight).toBe(expectedWeight);
    expect(hp.expectedHarm).toBeCloseTo(hp.nominalProbability * hp.severityWeight, 2);
  });
});
