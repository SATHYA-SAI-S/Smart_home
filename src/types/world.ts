export type CriticalityTier = 'ESSENTIAL' | 'SAFETY' | 'SECURITY' | 'COMFORT' | 'ENERGY';

export type CameraViewMode = 'person' | 'room' | 'top' | 'orbit';

export interface BoundingBox3D {
  min: [number, number, number];
  max: [number, number, number];
}

export interface RoomZone {
  id: string;
  name: string;
  bounds: BoundingBox3D;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  color: string;
  floorTextureType: 'wood' | 'tile' | 'concrete' | 'grass' | 'deck';
}

export type DeviceType = 
  | 'light'
  | 'fan'
  | 'ac'
  | 'refrigerator'
  | 'stove'
  | 'water_heater'
  | 'tv'
  | 'camera'
  | 'door_lock'
  | 'garage_door'
  | 'gate'
  | 'smart_plug'
  | 'main_switch';

export interface DeviceState {
  power?: 'on' | 'off';
  locked?: boolean;
  open?: boolean;
  level?: number; // temperature, fan speed, brightness (0-100)
  mode?: string;
  temperature?: number;
  [key: string]: any;
}

export interface DeviceCapabilityAction {
  name: string;
  description: string;
  preconditions: Record<string, any>;
  effects: Record<string, any>;
  sideEffects?: string[];
  hazards?: string[];
  reversibility: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'IRREVERSIBLE';
}

export interface DeviceSchema {
  type: DeviceType;
  criticality: CriticalityTier;
  actions: Record<string, DeviceCapabilityAction>;
}

export interface DeviceEntity {
  id: string;
  name: string;
  type: DeviceType;
  room: string;
  position: [number, number, number];
  criticality: CriticalityTier;
  state: DeviceState;
  isEssential?: boolean;
  powerConsumptionWatts?: number;
  highlighted?: boolean;
  hazardActive?: boolean;
}

export interface DoorEntity {
  id: string;
  name: string;
  fromRoom: string;
  toRoom: string;
  position: [number, number, number];
  rotationY: number; // 0 or Math.PI / 2
  width: number;
  isOpen: boolean;
  isLocked: boolean;
  hasInsideLatch?: boolean;
  isInsideLatched?: boolean;
  lockDeviceId?: string;
}

export interface PersonAttributes {
  ageGroup: 'child' | 'adult' | 'elderly';
  mobility: 'high' | 'normal' | 'reduced';
  vulnerability: number; // 0.1 (low) to 1.0 (high e.g. elderly/child)
  role: 'owner' | 'resident' | 'guest' | 'pet';
}

export interface PersonEntity {
  id: string;
  name: string;
  color: string;
  attributes: PersonAttributes;
  position: [number, number, number];
  rotationY: number;
  currentRoom: string;
  activity: 'idle' | 'walking' | 'sleeping' | 'bathing' | 'cooking' | 'resting';
  isControlled: boolean;
  pathWaypoints?: [number, number, number][];
  targetWaypointIndex?: number;
  idleTimer?: number;
  scriptedRoutine?: string | null;
}
