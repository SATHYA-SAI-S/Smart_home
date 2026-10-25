import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { EvaluationHarness, BenchmarkScenario, BenchmarkSummary } from '../eval/harness';

describe('C5: Benchmark Evaluation Harness & Metric Integrity Suite', () => {
  it('Requirement C5: Datasets exist and conform to required BenchmarkScenario schema', () => {
    const primaryPath = path.resolve(__dirname, '../eval/scenarios.json');
    const heldoutPath = path.resolve(__dirname, '../eval/heldout_scenarios.json');

    expect(fs.existsSync(primaryPath)).toBe(true);
    expect(fs.existsSync(heldoutPath)).toBe(true);

    const primary: BenchmarkScenario[] = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));
    const heldout: BenchmarkScenario[] = JSON.parse(fs.readFileSync(heldoutPath, 'utf-8'));

    // Requirement: 150+ primary scenarios, 30+ held-out scenarios
    expect(primary.length).toBeGreaterThanOrEqual(150);
    expect(heldout.length).toBeGreaterThanOrEqual(30);

    for (const sc of primary.slice(0, 20)) {
      expect(sc.id).toBeDefined();
      expect(sc.command.length).toBeGreaterThan(3);
      expect(['SAFE', 'RISKY', 'AMBIGUOUS']).toContain(sc.label);
      expect(Array.isArray(sc.expectedHazards)).toBe(true);
      expect(sc.category.length).toBeGreaterThan(0);
    }
  });

  it('Requirement C5: World preset generator configures physical state accurately', () => {
    const defaultWorld = EvaluationHarness.createWorldFromPreset('default');
    expect(defaultWorld.timeOfDay).toBe(14.0);

    const poolWorld = EvaluationHarness.createWorldFromPreset('swimmer_in_pool');
    const swimmer = poolWorld.people.find((p) => p.name === 'Kid');
    expect(swimmer?.currentRoom).toBe('swimming_pool');

    const smokeWorld = EvaluationHarness.createWorldFromPreset('smoke_alarm_active');
    const smoke = smokeWorld.devices.find((d) => d.id === 'smoke_detector');
    expect(smoke?.state.alarmActive).toBe(true);

    const nightWorld = EvaluationHarness.createWorldFromPreset('night_time');
    expect(nightWorld.timeOfDay).toBeGreaterThanOrEqual(21.0);
  });

  it('Requirement C5: Empirical Benchmark Execution — Naive vs SentinelHome Comparison', async () => {
    // Run evaluation across the 160 scenarios
    const summary: BenchmarkSummary = await EvaluationHarness.runBenchmark();

    expect(summary.totalCommands).toBeGreaterThanOrEqual(150);
    expect(summary.catchRate).toBeGreaterThanOrEqual(90.0);
    expect(summary.falsePositiveRate).toBeLessThanOrEqual(5.0);
    expect(summary.safeFulfillmentRate).toBeGreaterThanOrEqual(95.0);

    // Core Scientific Requirement: SentinelHome hazards must be vastly lower than naive baseline
    expect(summary.naiveHazardsPer100).toBeGreaterThan(summary.sentinelHazardsPer100);
    expect(summary.hazardReductionPercent).toBeGreaterThanOrEqual(80.0);

    // Multi-checkpoint simulation catches
    expect(summary.timeOnlyCatchesCount).toBeGreaterThan(0);

    // Latency must be measurable and realistic (non-zero)
    expect(summary.averageLatencyMs).toBeGreaterThan(0);
    expect(summary.p95LatencyMs).toBeGreaterThanOrEqual(summary.averageLatencyMs);

    // Verify results.json exists and is populated
    const resultsPath = path.resolve(__dirname, '../eval/results.json');
    expect(fs.existsSync(resultsPath)).toBe(true);
    const persisted: BenchmarkSummary = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    expect(persisted.totalCommands).toBe(summary.totalCommands);
  }, 30000);

  it('Requirement C5: Generalization check on held-out scenario dataset', async () => {
    const heldoutPath = path.resolve(__dirname, '../eval/heldout_scenarios.json');
    const heldoutSummary = await EvaluationHarness.runBenchmark(heldoutPath);

    expect(heldoutSummary.totalCommands).toBeGreaterThanOrEqual(30);
    expect(heldoutSummary.catchRate).toBeGreaterThanOrEqual(85.0);
    expect(heldoutSummary.safeFulfillmentRate).toBeGreaterThanOrEqual(90.0);
    expect(heldoutSummary.hazardReductionPercent).toBeGreaterThanOrEqual(75.0);
  }, 20000);
});
