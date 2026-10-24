import { create } from 'zustand';
import { 
  RoomZone, 
  DeviceEntity, 
  DoorEntity, 
  PersonEntity, 
  CameraViewMode 
} from '../types/world';
import { 
  INITIAL_ROOMS, 
  INITIAL_DEVICES, 
  INITIAL_DOORS, 
  INITIAL_PEOPLE 
} from '../data/initialWorld';

interface WorldStoreState {
  rooms: RoomZone[];
  devices: DeviceEntity[];
  doors: DoorEntity[];
  people: PersonEntity[];
  
  // Camera & view state
  cameraMode: CameraViewMode;
  selectedPersonId: string;
  selectedRoomId: string;
  timeOfDay: number; // 0.0 to 24.0 (14.0 = 2 PM)
  roofCutaway: boolean;
  fov: number; // 60-90
  fps: number;
  thirdPersonYaw: number;
  thirdPersonPitch: number;
  isPointerLocked: boolean;
  
  // Actions
  setCameraMode: (mode: CameraViewMode) => void;
  setSelectedPersonId: (id: string) => void;
  setSelectedRoomId: (id: string) => void;
  setTimeOfDay: (time: number) => void;
  setRoofCutaway: (cutaway: boolean) => void;
  setFov: (fov: number) => void;
  setFps: (fps: number) => void;
  setThirdPersonYaw: (yaw: number) => void;
  setThirdPersonPitch: (pitch: number) => void;
  setIsPointerLocked: (locked: boolean) => void;
  
  // Device management
  updateDeviceState: (deviceId: string, newState: Partial<Record<string, any>>) => void;
  updateDeviceCriticality: (deviceId: string, tier: any) => void;
  addDevice: (device: DeviceEntity) => void;
  removeDevice: (deviceId: string) => void;
  
  // Door management
  toggleDoor: (doorId: string) => void;
  setDoorOpen: (doorId: string, isOpen: boolean) => void;
  setDoorLocked: (doorId: string, isLocked: boolean) => void;
  setDoorInsideLatch: (doorId: string, isLatched: boolean) => void;
  
  // People management
  updatePersonPosition: (id: string, position: [number, number, number], rotationY?: number) => void;
  updatePersonActivity: (id: string, activity: any) => void;
  addPerson: (person: PersonEntity) => void;
  removePerson: (id: string) => void;
  updateOccupancy: () => void;
  
  // Helper getters
  getOccupantsInRoom: (roomId: string) => PersonEntity[];
  getDevicesInRoom: (roomId: string) => DeviceEntity[];
  isRoomOccupied: (roomId: string) => boolean;
}

export const useWorldStore = create<WorldStoreState>((set, get) => ({
  rooms: INITIAL_ROOMS,
  devices: INITIAL_DEVICES,
  doors: INITIAL_DOORS,
  people: INITIAL_PEOPLE,
  
  cameraMode: 'orbit',
  selectedPersonId: 'person_you',
  selectedRoomId: 'hall',
  timeOfDay: 14.5,
  roofCutaway: true,
  fov: 75,
  fps: 60,
  thirdPersonYaw: 0,
  thirdPersonPitch: 0.35,
  isPointerLocked: false,

  setCameraMode: (mode) => set({ cameraMode: mode }),
  setSelectedPersonId: (id) => set({ selectedPersonId: id }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
  setTimeOfDay: (time) => set({ timeOfDay: time }),
  setRoofCutaway: (cutaway) => set({ roofCutaway: cutaway }),
  setFov: (fov) => set({ fov }),
  setFps: (fps) => set({ fps }),
  setThirdPersonYaw: (yaw) => set({ thirdPersonYaw: yaw }),
  setThirdPersonPitch: (pitch) => set({ thirdPersonPitch: pitch }),
  setIsPointerLocked: (locked) => set({ isPointerLocked: locked }),

  updateDeviceState: (deviceId, newState) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId
          ? { ...d, state: { ...d.state, ...newState } }
          : d
      ),
    }));
  },

  updateDeviceCriticality: (deviceId, tier) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, criticality: tier } : d
      ),
    }));
  },

  addDevice: (device) => {
    set((state) => ({ devices: [...state.devices, device] }));
  },

  removeDevice: (deviceId) => {
    set((state) => ({ devices: state.devices.filter((d) => d.id !== deviceId) }));
  },

  toggleDoor: (doorId) => {
    const door = get().doors.find((d) => d.id === doorId);
    if (!door) return;
    if (door.isLocked) return; // Cannot toggle locked door directly
    get().setDoorOpen(doorId, !door.isOpen);
  },

  setDoorOpen: (doorId, isOpen) => {
    set((state) => ({
      doors: state.doors.map((d) => (d.id === doorId ? { ...d, isOpen } : d)),
    }));
  },

  setDoorLocked: (doorId, isLocked) => {
    set((state) => ({
      doors: state.doors.map((d) => {
        if (d.id !== doorId) return d;
        // Also sync lock device if mapped
        if (d.lockDeviceId) {
          state.updateDeviceState(d.lockDeviceId, { locked: isLocked });
        }
        return { ...d, isLocked };
      }),
    }));
  },

  setDoorInsideLatch: (doorId, isLatched) => {
    set((state) => ({
      doors: state.doors.map((d) =>
        d.id === doorId ? { ...d, isInsideLatched: isLatched } : d
      ),
    }));
  },

  updatePersonPosition: (id, position, rotationY) => {
    set((state) => ({
      people: state.people.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          position,
          rotationY: rotationY !== undefined ? rotationY : p.rotationY,
        };
      }),
    }));
    // Immediately compute occupancy for smooth response
    get().updateOccupancy();
  },

  updatePersonActivity: (id, activity) => {
    set((state) => ({
      people: state.people.map((p) =>
        p.id === id ? { ...p, activity } : p
      ),
    }));
  },

  addPerson: (person) => {
    set((state) => ({ people: [...state.people, person] }));
    get().updateOccupancy();
  },

  removePerson: (id) => {
    set((state) => ({
      people: state.people.filter((p) => p.id !== id),
      selectedPersonId:
        state.selectedPersonId === id
          ? state.people.find((p) => p.id !== id)?.id || ''
          : state.selectedPersonId,
    }));
  },

  updateOccupancy: () => {
    const { rooms, people } = get();
    let changed = false;

    const updatedPeople = people.map((person) => {
      const [px, , pz] = person.position;
      let matchingRoomId = 'lawn'; // default outdoor fallback

      for (const room of rooms) {
        const { min, max } = room.bounds;
        if (
          px >= min[0] &&
          px <= max[0] &&
          pz >= min[2] &&
          pz <= max[2]
        ) {
          matchingRoomId = room.id;
          break;
        }
      }

      if (person.currentRoom !== matchingRoomId) {
        changed = true;
        return { ...person, currentRoom: matchingRoomId };
      }
      return person;
    });

    if (changed) {
      set({ people: updatedPeople });
    }
  },

  getOccupantsInRoom: (roomId) => {
    return get().people.filter((p) => p.currentRoom === roomId);
  },

  getDevicesInRoom: (roomId) => {
    return get().devices.filter((d) => d.room === roomId);
  },

  isRoomOccupied: (roomId) => {
    return get().people.some((p) => p.currentRoom === roomId);
  },
}));
