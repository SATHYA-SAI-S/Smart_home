import { DeviceType, DeviceSchema, CriticalityTier } from '../types/world';

/**
 * Extensible Device Capability Registry.
 * Adding a new device type requires only registering a schema entry here.
 */
export class DeviceTypeRegistry {
  private static schemas: Map<DeviceType | string, DeviceSchema> = new Map();

  static register(schema: DeviceSchema): void {
    this.schemas.set(schema.type, schema);
  }

  static get(type: DeviceType | string): DeviceSchema | undefined {
    return this.schemas.get(type);
  }

  static getAll(): DeviceSchema[] {
    return Array.from(this.schemas.values());
  }

  static has(type: DeviceType | string): boolean {
    return this.schemas.has(type);
  }
}

// Built-in schemas for all simulated devices
const defaultSchemas: DeviceSchema[] = [
  {
    type: 'light',
    criticality: 'COMFORT',
    actions: {
      turn_on: {
        name: 'Turn On Light',
        description: 'Illuminates the room',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
      turn_off: {
        name: 'Turn Off Light',
        description: 'Darkens the room',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        hazards: ['poor_visibility_if_occupied'],
        reversibility: 'IMMEDIATE',
      },
      dim: {
        name: 'Dim Light',
        description: 'Adjust brightness level',
        preconditions: {},
        effects: { level: 30 },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'fan',
    criticality: 'COMFORT',
    actions: {
      turn_on: {
        name: 'Turn On Fan',
        description: 'Starts ceiling fan circulation',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
      turn_off: {
        name: 'Turn Off Fan',
        description: 'Stops ceiling fan',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'ac',
    criticality: 'COMFORT',
    actions: {
      turn_on: {
        name: 'Turn On AC',
        description: 'Initiates climate cooling',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
      turn_off: {
        name: 'Turn Off AC',
        description: 'Shuts off climate cooling',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        hazards: ['thermal_discomfort_vulnerable'],
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'refrigerator',
    criticality: 'ESSENTIAL',
    actions: {
      turn_off: {
        name: 'Turn Off Refrigerator',
        description: 'Disconnects cooling power to refrigerator compressor',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        hazards: ['food_spoilage', 'essential_appliance_cut'],
        reversibility: 'HIGH',
      },
      turn_on: {
        name: 'Turn On Refrigerator',
        description: 'Restores power to refrigerator compressor',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'stove',
    criticality: 'SAFETY',
    actions: {
      turn_on: {
        name: 'Turn On Stove',
        description: 'Activates thermal cooktop burners',
        preconditions: { power: 'off' },
        effects: { power: 'on', temperature: 180 },
        hazards: ['unattended_fire_hazard'],
        reversibility: 'IMMEDIATE',
      },
      turn_off: {
        name: 'Turn Off Stove',
        description: 'Deactivates thermal cooktop burners',
        preconditions: { power: 'on' },
        effects: { power: 'off', temperature: 0 },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'water_heater',
    criticality: 'SAFETY',
    actions: {
      turn_off: {
        name: 'Turn Off Water Heater',
        description: 'Powers down instant water heater',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        reversibility: 'IMMEDIATE',
      },
      turn_on: {
        name: 'Turn On Water Heater',
        description: 'Heats domestic water supply',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'tv',
    criticality: 'COMFORT',
    actions: {
      turn_on: {
        name: 'Turn On TV',
        description: 'Activates media display',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
      turn_off: {
        name: 'Turn Off TV',
        description: 'Puts media display into standby',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'camera',
    criticality: 'SECURITY',
    actions: {
      turn_off: {
        name: 'Turn Off Camera',
        description: 'Suspends perimeter and security video stream',
        preconditions: { power: 'on' },
        effects: { power: 'off', recording: false },
        hazards: ['perimeter_blindspot'],
        reversibility: 'IMMEDIATE',
      },
      turn_on: {
        name: 'Turn On Camera',
        description: 'Activates perimeter surveillance',
        preconditions: { power: 'off' },
        effects: { power: 'on', recording: true },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'door_lock',
    criticality: 'SAFETY',
    actions: {
      lock: {
        name: 'Lock Door',
        description: 'Engages security deadbolt',
        preconditions: { open: false },
        effects: { locked: true },
        hazards: ['traps_occupant_if_room_occupied', 'mechanical_jam_if_open'],
        reversibility: 'IMMEDIATE',
      },
      unlock: {
        name: 'Unlock Door',
        description: 'Disengages security deadbolt',
        preconditions: {},
        effects: { locked: false },
        hazards: ['perimeter_unsecured_at_night'],
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'garage_door',
    criticality: 'SECURITY',
    actions: {
      open: {
        name: 'Open Garage Door',
        description: 'Raises overhead garage door',
        preconditions: { locked: false },
        effects: { open: true },
        reversibility: 'IMMEDIATE',
      },
      close: {
        name: 'Close Garage Door',
        description: 'Lowers overhead garage door',
        preconditions: {},
        effects: { open: false },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'gate',
    criticality: 'SECURITY',
    actions: {
      open: {
        name: 'Open Gate',
        description: 'Swings perimeter driveway gate open',
        preconditions: { locked: false },
        effects: { open: true },
        reversibility: 'IMMEDIATE',
      },
      close: {
        name: 'Close Gate',
        description: 'Swings perimeter driveway gate shut',
        preconditions: {},
        effects: { open: false },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'smart_plug',
    criticality: 'COMFORT',
    actions: {
      turn_off: {
        name: 'Turn Off Smart Plug',
        description: 'Cuts auxiliary socket relay power',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        hazards: ['disconnects_plugged_appliance'],
        reversibility: 'IMMEDIATE',
      },
      turn_on: {
        name: 'Turn On Smart Plug',
        description: 'Energizes auxiliary socket relay power',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'main_switch',
    criticality: 'ESSENTIAL',
    actions: {
      turn_off: {
        name: 'Cut Main Breaker Power',
        description: 'Interrupts entire residential AC circuit power',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        sideEffects: ['cuts_all_devices', 'kills_fridge', 'kills_cameras', 'kills_medical'],
        hazards: ['cascading_blackout', 'essential_system_failure'],
        reversibility: 'HIGH',
      },
      turn_on: {
        name: 'Restore Main Breaker Power',
        description: 'Restores entire residential electrical grid',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'safety_sensor',
    criticality: 'ESSENTIAL',
    actions: {
      turn_off: {
        name: 'Mute/Disable Safety Sensor',
        description: 'Mutes or disables detector sensors (smoke, CO, gas, leak)',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        hazards: ['undetected_life_safety_hazard'],
        reversibility: 'HIGH',
      },
      turn_on: {
        name: 'Enable Safety Sensor',
        description: 'Activates detector monitoring',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'gas_valve',
    criticality: 'SAFETY',
    actions: {
      turn_off: {
        name: 'Shut Off Gas Valve',
        description: 'Isolates residential gas line supply',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        reversibility: 'IMMEDIATE',
      },
      turn_on: {
        name: 'Open Gas Valve / Ignite Gas',
        description: 'Opens gas valve line or activates ignition',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        hazards: ['gas_leak_hazard', 'fire_explosion_unattended'],
        reversibility: 'IMMEDIATE',
      },
    },
  },
  {
    type: 'siren',
    criticality: 'ESSENTIAL',
    actions: {
      turn_off: {
        name: 'Silence Emergency Siren',
        description: 'Silences residential alert siren',
        preconditions: { power: 'on' },
        effects: { power: 'off' },
        hazards: ['unheard_evacuation_alert'],
        reversibility: 'HIGH',
      },
      turn_on: {
        name: 'Sound Siren Alarm',
        description: 'Activates emergency acoustic siren',
        preconditions: { power: 'off' },
        effects: { power: 'on' },
        reversibility: 'IMMEDIATE',
      },
    },
  },
];

// Register default schemas
defaultSchemas.forEach((s) => DeviceTypeRegistry.register(s));
