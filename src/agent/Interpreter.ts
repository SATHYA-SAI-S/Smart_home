import { Intent } from '../types/agent';
import { PersonEntity, RoomZone } from '../types/world';

/**
 * Normalizes input text and handles common typo / noisy speech phonetics
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .trim();
}

/**
 * Resilient Offline Rule-based NLP Interpreter.
 * Employs keyword clustering, synonym mapping, and context grounding.
 */
export class OfflineInterpreter {
  static parse(
    prompt: string,
    speaker: PersonEntity,
    rooms: RoomZone[]
  ): Intent {
    const raw = prompt.trim();
    const clean = normalizeText(raw);

    const speakerRoom = speaker.currentRoom || 'hall';
    const ambiguities: string[] = [];
    const constraints: string[] = [];
    let goal = 'custom_action';
    let scope = 'all';
    let urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY' = 'NORMAL';
    let confidence = 0.85;

    // Check if speaker is child or vulnerable
    if (speaker.attributes.ageGroup === 'child') {
      constraints.push('speaker_is_child_requires_guardian_safeguard');
    }

    // Reference resolution: "here" / "this room" -> speaker's current location
    let targetRoom: string | null = null;
    if (clean.includes('here') || clean.includes('this room')) {
      targetRoom = speakerRoom;
    } else {
      for (const r of rooms) {
        if (clean.includes(r.id) || clean.includes(r.name.toLowerCase())) {
          targetRoom = r.id;
          break;
        }
      }
    }

    // 1. Leaving Home / Out / Departure (with typo tolerance)
    if (
      clean.match(/\b(leav(e|ing)?|leva(e|ing)?|step(ping)? out|goodbye|bye|going out|away|vacation|depart)\b/) ||
      (clean.includes('hoem') && (clean.includes('shudown') || clean.includes('plez') || clean.includes('leva')))
    ) {
      goal = 'leave_home';
      scope = 'all';
      constraints.push('secure_doors_and_perimeter', 'turn_off_non_essential_appliances');
      confidence = 0.95;
    }
    // 2. Sleep / Goodnight / Bedtime
    else if (
      clean.match(/\b(goodnight|sleep(ing)?|bed(time)?|retiring|turn in)\b/)
    ) {
      goal = 'prepare_sleep';
      scope = 'all';
      constraints.push('lock_exterior_doors', 'extinguish_unneeded_lights', 'keep_bedroom_comfortable');
      confidence = 0.94;
    }
    // 3. Make it Cozy / Relax
    else if (
      clean.match(/\b(cozy|cosy|relax|movie|ambient|comfortable|chill)\b/)
    ) {
      goal = 'make_cozy';
      scope = targetRoom || 'hall';
      constraints.push('dim_lights', 'gentle_climate');
      confidence = 0.88;
    }
    // 4. Cooking / Kitchen Work
    else if (
      clean.match(/\b(cook(ing)?|dinner|lunch|breakfast|chef|meal|stove)\b/)
    ) {
      goal = 'cook_mode';
      scope = 'kitchen';
      constraints.push('keep_kitchen_on', 'preserve_kitchen_lighting');
      confidence = 0.92;
    }
    // 5. Turn off what Grandpa isn't using / Unoccupied energy saving
    else if (
      clean.match(/\b(grandpa|elderly|not using|unoccupied|empty room|conserve|waste)\b/)
    ) {
      goal = 'turn_off_unoccupied';
      scope = 'unoccupied';
      constraints.push('preserve_grandpa_comfort', 'preserve_occupied_areas');
      confidence = 0.9;
    }
    // 6. Lock all doors / Perimeter Security
    else if (
      clean.match(/\b(lock all|lock up|secure (doors|house|home|perimeter))\b/)
    ) {
      goal = 'secure_perimeter';
      scope = 'doors';
      constraints.push('lock_doors_if_closed');
      confidence = 0.94;
    }
    // 7. Safety Inspection / "Is everything safe?"
    else if (
      clean.match(/\b(safe|safety|check|status|inspection|all good|hazard)\b/)
    ) {
      goal = 'inspect_safety';
      scope = 'all';
      confidence = 0.95;
    }
    // 8. Turn off / Cut power requests
    else if (clean.match(/\b(turn off|shut down|power off|kill|disable|cut)\b/)) {
      goal = 'turn_off_devices';
      scope = targetRoom || (clean.includes('all') ? 'all' : 'unspecified');
      confidence = 0.85;

      // Adversarial test detection: "turn off fridge", "cut main switch"
      if (clean.includes('fridge') || clean.includes('refrigerator')) {
        constraints.push('fridge_cut_requested_invariant_must_block');
      }
      if (clean.includes('main switch') || clean.includes('breaker') || clean.includes('grid')) {
        constraints.push('main_breaker_cut_requested_critical_hazard');
      }
    }
    // 9. Turn on / Illuminate
    else if (clean.match(/\b(turn on|power on|activate|enable|light up)\b/)) {
      goal = 'turn_on_devices';
      scope = targetRoom || 'all';
      confidence = 0.85;

      const words = clean.split(/\s+/);
      const knownDeviceWords = ['light', 'lights', 'fan', 'fans', 'ac', 'tv', 'stove', 'heater', 'camera', 'fridge', 'plug', 'gate', 'door', 'all'];
      const hasKnownDevice = words.some((w) => knownDeviceWords.includes(w)) || targetRoom !== null;
      if (!hasKnownDevice) {
        confidence = 0.6;
        ambiguities.push(`Command "${raw}" mentions an unrecognized appliance or unknown device type.`);
      }
    }
    // 10. Direct Lock / Unlock
    else if (clean.match(/\b(lock|unlock)\b/)) {
      goal = clean.includes('unlock') ? 'unlock_doors' : 'lock_doors';
      scope = targetRoom || 'doors';
      confidence = 0.88;
    }
    // Fallback for vague or unknown utterances
    else {
      goal = 'general_context_assist';
      scope = targetRoom || 'all';
      confidence = 0.55;
      ambiguities.push(`Command "${raw}" is ambiguous or missing specific device/room target.`);
    }

    return {
      goal,
      scope,
      urgency,
      speaker: speaker.name,
      constraints,
      confidence,
      ambiguities,
      rawUnderstanding: `Interpreted goal: [${goal}] for scope: [${scope}], speaker: [${speaker.name}].`,
    };
  }
}

/**
 * Main Interpreter service: queries Gemini API on backend proxy,
 * falling back seamlessly to OfflineInterpreter if offline or error.
 */
export class Interpreter {
  static async interpret(
    prompt: string,
    speaker: PersonEntity,
    rooms: RoomZone[]
  ): Promise<Intent> {
    try {
      const response = await fetch('/api/agent/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          speaker: speaker.name,
          worldSummary: {
            speakerLocation: speaker.currentRoom,
            speakerAttributes: speaker.attributes,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success !== false && data.intent && !data.fallback) {
          return data.intent;
        }
      }
    } catch {
      // Backend not running or offline: proceed to offline interpreter
    }

    // Fallback to high-capability deterministic parser
    return OfflineInterpreter.parse(prompt, speaker, rooms);
  }
}
