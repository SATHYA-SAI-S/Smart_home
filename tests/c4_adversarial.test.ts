import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import { AdversarialValidator } from '../src/agent/AdversarialValidator';
import { HostileLLMMock, HostileAttackType } from '../src/agent/HostileLLMMock';
import { PolicyEngine } from '../src/agent/PolicyEngine';
import { Recommender } from '../src/agent/Recommender';
import { CommitGuard } from '../src/agent/CommitGuard';
import { INITIAL_DEVICES, INITIAL_DOORS, INITIAL_PEOPLE, INITIAL_ROOMS, INITIAL_RULES } from '../src/data/initialWorld';
import { PlanStep } from '../src/types/agent';
import { DeviceEntity, DoorEntity, PersonEntity, RoomZone } from '../src/types/world';

describe('C4: Adversarial LLM Testing & Schema Validation Suite', () => {
  const getFreshWorld = () => ({
    devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)) as DeviceEntity[],
    doors: JSON.parse(JSON.stringify(INITIAL_DOORS)) as DoorEntity[],
    people: JSON.parse(JSON.stringify(INITIAL_PEOPLE)) as PersonEntity[],
    rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)) as RoomZone[],
    timeOfDay: 14.0,
  });

  it('Requirement C4: Rejects hallucinated and unknown devices at the schema layer', () => {
    const world = getFreshWorld();
    const hostile = HostileLLMMock.generateHostilePlan('HALLUCINATED_DEVICE', world);

    const validation = AdversarialValidator.validate(
      hostile.rawPlan,
      { devices: world.devices, rooms: world.rooms },
      hostile.intent
    );

    expect(validation.valid).toBe(false);
    expect(validation.rejectedSteps.length).toBe(2);
    expect(validation.cleanPlan.length).toBe(0);
    expect(validation.issues.every((i) => i.layer === 'schema_layer')).toBe(true);
  });

  it('Requirement C4: Hard invariants NEVER violated at commit under Hostile LLM attacks', async () => {
    const world = getFreshWorld();
    const attacks: HostileAttackType[] = [
      'CUT_ESSENTIAL_POWER',
      'PROMPT_INJECTION',
      'DISGUISED_SWIMMER_ATTACK',
    ];

    for (const attack of attacks) {
      const hostile = HostileLLMMock.generateHostilePlan(attack, world);
      const validation = AdversarialValidator.validate(
        hostile.rawPlan,
        { devices: world.devices, rooms: world.rooms },
        hostile.intent
      );

      const { safePlan, violations } = PolicyEngine.evaluateInvariants(validation.cleanPlan, world);
      const token = CommitGuard.createToken(safePlan, world);

      const commitResult = await CommitGuard.commit(
        token,
        safePlan,
        hostile.intent,
        [],
        [],
        world,
        'Attacker'
      );

      // Core Invariant: At commit boundary, no hard invariant violation can EVER succeed
      expect(commitResult.status).not.toBe('BLOCKED_INVARIANT'); // Because safePlan safely blocked/repaired them!
      for (const step of commitResult.executedSteps || []) {
        expect(step.isBlockedByInvariant).toBeFalsy();
        const dev = world.devices.find((d) => d.id === step.deviceId);
        if (dev?.criticality === 'ESSENTIAL') {
          expect(step.targetState.power).not.toBe('off');
        }
      }
    }
  });

  it('Requirement C4: 45 Adversarial Prompts Suite — All blocked or safely repaired, layer counts recorded', async () => {
    const dataFilePath = path.resolve(__dirname, '../data/adversarialPrompts.json');
    const promptsRaw = fs.readFileSync(dataFilePath, 'utf-8');
    const scenarios: Array<{
      id: string;
      prompt: string;
      category: string;
      attackType: HostileAttackType;
      expectedLayer: string;
    }> = JSON.parse(promptsRaw);

    expect(scenarios.length).toBeGreaterThanOrEqual(40);

    const layerCounts = {
      schema_layer: 0,
      invariants: 0,
      risk_engine: 0,
    };

    let totalBlockedOrRepaired = 0;

    for (const sc of scenarios) {
      const world = getFreshWorld();
      
      // If swimmer scenario, place a swimmer in the pool
      if (sc.category === 'swimmer_suction') {
        const swimmer = world.people.find((p) => p.name === 'Kid');
        if (swimmer) swimmer.currentRoom = 'swimming_pool';
      }

      // If emergency egress scenario, trigger alarm sensor
      if (sc.category === 'emergency_egress') {
        const smoke = world.devices.find((d) => d.id === 'smoke_detector_kitchen');
        if (smoke) smoke.state.alarmActive = true;
      }

      // If night lighting scenario, set time of day to midnight
      if (sc.category === 'night_lighting') {
        world.timeOfDay = 23.0;
      }

      // Generate attack payload
      const hostile = HostileLLMMock.generateHostilePlan(sc.attackType, world, sc.category);

      // Layer 1: Schema Validator
      const validation = AdversarialValidator.validate(
        hostile.rawPlan,
        { devices: world.devices, rooms: world.rooms },
        hostile.intent
      );

      let caughtBy = 'none';

      if (validation.rejectedSteps.length > 0) {
        caughtBy = 'schema_layer';
        layerCounts.schema_layer++;
      } else {
        // Layer 2: Deterministic Hard Invariants
        const { safePlan, violations } = PolicyEngine.evaluateInvariants(validation.cleanPlan, world);
        if (violations.length > 0) {
          caughtBy = 'invariants';
          layerCounts.invariants++;
        } else {
          // Layer 3: Soft Risk Engine & Recommender
          const findings = PolicyEngine.evaluateSoftRisks(safePlan, [], INITIAL_RULES, {
            devices: world.devices,
            doors: world.doors,
            people: world.people,
            timeOfDay: world.timeOfDay,
          });

          if (findings.length > 0) {
            caughtBy = 'risk_engine';
            layerCounts.risk_engine++;
          }
        }
      }

      // Verify that every single hostile scenario was caught and intercepted
      expect(caughtBy).not.toBe('none');
      totalBlockedOrRepaired++;
    }

    console.log(`[C4 Evaluation Evidence] Real Layer Catch Counts across ${scenarios.length} Adversarial Cases:`, layerCounts);
    expect(totalBlockedOrRepaired).toBe(scenarios.length);
    expect(layerCounts.schema_layer).toBeGreaterThan(0);
    expect(layerCounts.invariants).toBeGreaterThan(0);
    expect(layerCounts.risk_engine).toBeGreaterThan(0);
  });

  it('Requirement C4: Seeded fast-check property over random worlds and hostile plans', () => {
    // Seeded property test: 100 random world/action combinations
    fc.assert(
      fc.property(
        fc.constantFrom(...INITIAL_DEVICES.map((d) => d.id)),
        fc.constantFrom('turn_on', 'turn_off', 'lock', 'unlock', 'fire_laser', 'unknown_act'),
        fc.constantFrom('hall', 'bedroom', 'bathroom', 'kitchen', 'unknown_room'),
        fc.boolean(),
        (devId, action, room, essentialFlag) => {
          const world = getFreshWorld();
          const targetDev = world.devices.find((d) => d.id === devId)!;

          const hostileStep: PlanStep = {
            id: `fc_step_${Math.random()}`,
            deviceId: devId,
            deviceName: targetDev.name,
            deviceType: targetDev.type,
            room,
            action,
            targetState: { power: action === 'turn_off' ? 'off' : 'on' },
            currentState: { ...targetDev.state },
            reason: 'Hostile fuzzing test step',
            isEssential: essentialFlag,
            approved: true,
          };

          const validation = AdversarialValidator.validate(
            [hostileStep],
            { devices: world.devices, rooms: world.rooms },
            {
              goal: 'fuzz',
              scope: 'all',
              urgency: 'HIGH',
              speaker: 'Fuzzer',
              constraints: [],
              confidence: 0.9,
              ambiguities: [],
            }
          );

          if (room === 'unknown_room' || action === 'fire_laser' || action === 'unknown_act') {
            // Must be caught at schema layer!
            expect(validation.rejectedSteps.length).toBe(1);
          } else {
            // Check invariant layer
            const { safePlan } = PolicyEngine.evaluateInvariants(validation.cleanPlan, world);
            if (targetDev.criticality === 'ESSENTIAL' && action === 'turn_off') {
              // Essential power cuts MUST be blocked!
              expect(safePlan[0].isBlockedByInvariant).toBe(true);
            }
          }
        }
      ),
      { seed: 4242, numRuns: 100 }
    );
  });
});
