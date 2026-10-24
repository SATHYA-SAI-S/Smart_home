import React, { useState } from 'react';
import { 
  Lightbulb, 
  Wind, 
  Tv, 
  Lock, 
  Unlock, 
  Flame, 
  Zap, 
  ThermometerSnowflake, 
  Video,
  Waves
} from 'lucide-react';
import { useWorldStore, isPersonInPool } from '../../store/useWorldStore';
import { useAgentStore } from '../../store/useAgentStore';

export const BottomDeviceStrip: React.FC = () => {
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const devices = useWorldStore((state) => state.devices);
  const people = useWorldStore((state) => state.people);
  const rooms = useWorldStore((state) => state.rooms);
  const updateDeviceState = useWorldStore((state) => state.updateDeviceState);
  const setDoorLocked = useWorldStore((state) => state.setDoorLocked);
  const doors = useWorldStore((state) => state.doors);
  const addMessage = useAgentStore((state) => state.addMessage);

  const filteredDevices = devices.filter(
    (d) => selectedRoomFilter === 'all' || d.room === selectedRoomFilter
  );

  const handleToggle = (dev: any) => {
    if (dev.type === 'door_lock') {
      const nextLocked = !dev.state.locked;
      updateDeviceState(dev.id, { locked: nextLocked });
      const mappedDoor = doors.find((door) => door.lockDeviceId === dev.id);
      if (mappedDoor) {
        setDoorLocked(mappedDoor.id, nextLocked);
      }
    } else {
      const nextPower = dev.state.power === 'on' ? 'off' : 'on';

      // Swimmer Safety Interlock Check for Pool Filter
      if (dev.id === 'pool_filter' && nextPower === 'on') {
        const swimmers = people.filter(
          (p) => p.currentRoom === 'pool' || isPersonInPool(p.position)
        );
        if (swimmers.length > 0) {
          const names = swimmers.map((p) => p.name).join(', ');
          addMessage({
            sender: 'agent',
            text: `SAFETY INTERLOCK VIOLATION: Cannot turn on swimming pool filter switch while swimmer(s) [${names}] are inside the swimming pool! High suction and electrical shock hazard.`,
            isComplete: true,
          });
          return;
        }
      }

      updateDeviceState(dev.id, { power: nextPower, filtering: nextPower === 'on' });
    }
  };

  const getDeviceIcon = (dev: any) => {
    switch (dev.type) {
      case 'light':
        return <Lightbulb size={12} className={dev.state.power === 'on' ? 'text-amber-300' : 'text-slate-500'} />;
      case 'fan':
        return <Wind size={12} className={dev.state.power === 'on' ? 'text-sky-300 animate-spin' : 'text-slate-500'} />;
      case 'ac':
        return <ThermometerSnowflake size={12} className={dev.state.power === 'on' ? 'text-cyan-300' : 'text-slate-500'} />;
      case 'tv':
        return <Tv size={12} className={dev.state.power === 'on' ? 'text-indigo-300' : 'text-slate-500'} />;
      case 'stove':
        return <Flame size={12} className={dev.state.power === 'on' ? 'text-rose-400' : 'text-slate-500'} />;
      case 'door_lock':
        return dev.state.locked ? (
          <Lock size={12} className="text-rose-400" />
        ) : (
          <Unlock size={12} className="text-emerald-400" />
        );
      case 'camera':
        return <Video size={12} className={dev.state.power === 'on' ? 'text-emerald-400' : 'text-slate-500'} />;
      case 'pool_filter':
        return <Waves size={12} className={dev.state.power === 'on' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'} />;
      default:
        return <Zap size={12} className={dev.state.power === 'on' ? 'text-amber-400' : 'text-slate-500'} />;
    }
  };

  return (
    <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none flex justify-center">
      <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 pointer-events-auto shadow-2xl max-w-5xl overflow-x-auto no-scrollbar border border-white/10">
        {/* ROOM FILTER SELECT */}
        <div className="flex items-center space-x-1 shrink-0 pr-2 border-r border-white/10 text-xs">
          <select
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            className="bg-slate-900/90 text-[10px] font-semibold text-slate-300 rounded-lg px-2 py-1 border border-white/10 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="all">All Devices ({devices.length})</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* DEVICE STATUS CHIPS */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {filteredDevices.map((dev) => {
            const isActive = dev.type === 'door_lock' ? dev.state.locked : dev.state.power === 'on';

            return (
              <button
                key={dev.id}
                onClick={() => handleToggle(dev)}
                className={`px-2 py-1 rounded-xl border transition-all duration-150 flex items-center space-x-1.5 text-xs font-medium cursor-pointer ${
                  isActive
                    ? 'bg-slate-800/90 border-sky-500/40 text-white shadow-sm'
                    : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
                }`}
                title={`Click to manually toggle ${dev.name}`}
              >
                {getDeviceIcon(dev)}
                <span className="truncate max-w-[100px] text-[10px]">{dev.name.split(' ')[0]}</span>
                {dev.criticality === 'ESSENTIAL' && (
                  <span className="text-[7px] uppercase font-bold text-rose-300 bg-rose-500/20 px-1 rounded">
                    ESS
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
