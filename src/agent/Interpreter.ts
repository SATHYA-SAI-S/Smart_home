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

    // Detect device keywords in utterance with word boundaries
    let detectedDevice: string | null = null;
    if (clean.match(/\bfans?\b/)) detectedDevice = 'fan';
    else if (clean.match(/\blights?\b|\blightings?\b|\blamps?\b|\blite\b/)) detectedDevice = 'light';
    else if (clean.match(/\bac\b/) || clean.includes('air conditioner') || clean.includes('cooling')) detectedDevice = 'ac';
    else if (clean.match(/\btv\b/) || clean.includes('television')) detectedDevice = 'tv';
    else if (clean.match(/\bstoves?\b|\bovens?\b|\bcooktop\b/)) detectedDevice = 'stove';
    else if (clean.match(/\bfridges?\b|\brefrigerators?\b/)) detectedDevice = 'refrigerator';
    else if (clean.match(/\bheaters?\b|\bgeysers?\b/)) detectedDevice = 'water_heater';
    else if (clean.match(/\bmicrowaves?\b/)) detectedDevice = 'microwave';
    else if (clean.includes('bedroom door') || (clean.includes('bedroom') && clean.includes('door'))) detectedDevice = 'bedroom_door_lock';
    else if (clean.includes('bathroom door') || (clean.includes('bathroom') && clean.includes('door'))) detectedDevice = 'bathroom_door_lock';
    else if (clean.includes('kitchen door') || (clean.includes('kitchen') && clean.includes('door'))) detectedDevice = 'kitchen_door_lock';
    else if (clean.includes('terrace door') || (clean.includes('terrace') && clean.includes('door'))) detectedDevice = 'terrace_door_lock';
    else if (clean.includes('front') || clean.includes('main door') || clean.includes('entrance')) detectedDevice = 'main_door_lock';
    else if (clean.match(/\bgarages?\b/)) detectedDevice = 'garage_door';
    else if (clean.match(/\bgates?\b/)) detectedDevice = 'gate';
    else if (clean.match(/\bdoors?\b|\blocks?\b/)) detectedDevice = 'doors';

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
    // 8. Pool Filtering Commands & Switch
    else if (
      clean.match(/\b(filter|filtering|pool filter|skimmer|pool pump)\b/) ||
      (clean.includes('pool') && clean.match(/\b(clean|filter|switch|pump|process)\b/))
    ) {
      const isOff = clean.match(/\b(off|stop|shut|disable|kill|deactivate)\b/);
      goal = isOff ? 'turn_off_devices' : 'turn_on_devices';
      scope = 'pool_filter';
      confidence = 0.96;
      constraints.push('verify_pool_swimmer_safety');
    }
    // 9. Turn off / Cut power requests (e.g. "off the fan", "turn off lights", "switch off AC")
    else if (
      clean.match(/\b(turn off|shut down|power off|kill|disable|cut|switch off|deactivate|extinguish)\b/) ||
      (clean.match(/\b(off)\b/) && (detectedDevice !== null || targetRoom !== null || clean.includes('all')))
    ) {
      goal = 'turn_off_devices';
      scope = (detectedDevice === 'microwave') ? 'microwave' : (targetRoom || detectedDevice || (clean.includes('all') ? 'all' : 'unspecified'));
      confidence = detectedDevice || targetRoom ? 0.95 : 0.85;

      // Adversarial test detection: "turn off fridge", "cut main switch", "disable smoke detector"
      if (clean.includes('fridge') || clean.includes('refrigerator')) {
        constraints.push('fridge_cut_requested_invariant_must_block');
      }
      if (clean.includes('main switch') || clean.includes('breaker') || clean.includes('grid')) {
        constraints.push('main_breaker_cut_requested_critical_hazard');
      }
      if (clean.includes('smoke') || clean.includes('co') || clean.includes('leak') || clean.includes('siren') || clean.includes('sensor')) {
        constraints.push('sensor_or_siren_disable_requested_invariant_must_block');
      }
    }
    // 10. Turn on / Illuminate (e.g. "on the fan", "turn on hall lights")
    else if (
      clean.match(/\b(turn on|power on|activate|enable|light up|switch on|start)\b/) ||
      (clean.match(/\b(on)\b/) && (detectedDevice !== null || targetRoom !== null))
    ) {
      goal = 'turn_on_devices';
      scope = (detectedDevice === 'microwave') ? 'microwave' : (targetRoom || detectedDevice || 'all');
      confidence = detectedDevice || targetRoom ? 0.95 : 0.85;

      if ((clean.includes('camera') || clean.includes('mic')) && (clean.includes('bedroom') || clean.includes('bathroom'))) {
        constraints.push('camera_in_private_room_prohibited');
      }
      if (clean.includes('gas')) {
        constraints.push('gas_activation_requires_occupant_presence');
      }

      const words = clean.split(/\s+/);
      const knownDeviceWords = ['light', 'lights', 'fan', 'fans', 'ac', 'tv', 'stove', 'heater', 'camera', 'fridge', 'plug', 'gate', 'door', 'gas', 'sensor', 'siren', 'filter', 'filtering', 'pool', 'pump', 'microwave', 'all'];
      const hasKnownDevice = words.some((w) => knownDeviceWords.includes(w)) || targetRoom !== null || detectedDevice !== null;
      if (!hasKnownDevice) {
        confidence = 0.6;
        ambiguities.push(`Command "${raw}" mentions an unrecognized appliance or unknown device type.`);
      }
    }
    // 11. Direct Door Open / Close (e.g. "close the bedroom door", "open bedroom door", "shut front door")
    else if (
      clean.match(/\b(open|close|shut)\b/) &&
      (clean.includes('door') || clean.includes('gate') || clean.includes('garage') || detectedDevice?.includes('door') || detectedDevice === 'gate' || detectedDevice === 'garage_door')
    ) {
      const isClose = clean.match(/\b(close|shut)\b/);
      goal = isClose ? 'close_door' : 'open_door';
      scope = detectedDevice || (targetRoom ? `${targetRoom}_door_lock` : 'doors');
      confidence = 0.95;
    }
    // 12. Direct Lock / Unlock
    else if (clean.match(/\b(lock|unlock)\b/)) {
      goal = clean.includes('unlock') ? 'unlock_doors' : 'lock_doors';
      scope = detectedDevice || (targetRoom ? `${targetRoom}_door_lock` : 'doors');
      confidence = 0.92;
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
