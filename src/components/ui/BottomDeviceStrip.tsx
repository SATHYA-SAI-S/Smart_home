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
  Power 
} from 'lucide-react';
import { useWorldStore } from '../../store/useWorldStore';

export const BottomDeviceStrip: React.FC = () => {
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const devices = useWorldStore((state) => state.devices);
  const rooms = useWorldStore((state) => state.rooms);
  const updateDeviceState = useWorldStore((state) => state.updateDeviceState);
  const setDoorLocked = useWorldStore((state) => state.setDoorLocked);
  const doors = useWorldStore((state) => state.doors);

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
      updateDeviceState(dev.id, { power: nextPower });
    }
  };

  const getDeviceIcon = (dev: any) => {
    switch (dev.type) {
      case 'light':
        return <Lightbulb size={13} className={dev.state.power === 'on' ? 'text-amber-300' : 'text-slate-400'} />;
      case 'fan':
        return <Wind size={13} className={dev.state.power === 'on' ? 'text-sky-300 animate-spin' : 'text-slate-400'} />;
      case 'ac':
        return <ThermometerSnowflake size={13} className={dev.state.power === 'on' ? 'text-cyan-300' : 'text-slate-400'} />;
      case 'tv':
        return <Tv size={13} className={dev.state.power === 'on' ? 'text-indigo-300' : 'text-slate-400'} />;
      case 'stove':
        return <Flame size={13} className={dev.state.power === 'on' ? 'text-rose-400' : 'text-slate-400'} />;
      case 'door_lock':
        return dev.state.locked ? (
          <Lock size={13} className="text-rose-400" />
        ) : (
          <Unlock size={13} className="text-emerald-400" />
        );
      case 'camera':
        return <Video size={13} className={dev.state.power === 'on' ? 'text-emerald-400' : 'text-slate-400'} />;
      default:
        return <Zap size={13} className={dev.state.power === 'on' ? 'text-amber-400' : 'text-slate-400'} />;
    }
  };

  return (
    <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none flex justify-center">
      <div className="glass-panel px-4 py-2 rounded-2xl flex items-center space-x-3 pointer-events-auto shadow-2xl max-w-5xl overflow-x-auto no-scrollbar">
        {/* ROOM FILTER PILL */}
        <div className="flex items-center space-x-1 shrink-0 pr-3 border-r border-white/10 text-xs">
          <select
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            className="bg-slate-900/90 text-[11px] font-semibold text-slate-300 rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="all">All Rooms ({devices.length})</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* DEVICE STATUS CHIPS */}
        <div className="flex items-center space-x-2 shrink-0">
          {filteredDevices.map((dev) => {
            const isActive = dev.type === 'door_lock' ? dev.state.locked : dev.state.power === 'on';

            return (
              <button
                key={dev.id}
                onClick={() => handleToggle(dev)}
                className={`px-2.5 py-1.5 rounded-xl border transition flex items-center space-x-2 text-xs font-medium cursor-pointer ${
                  isActive
                    ? 'bg-slate-800/90 border-sky-500/40 text-white shadow-sm'
                    : 'bg-slate-900/50 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
                title={`Click to manually toggle ${dev.name}`}
              >
                {getDeviceIcon(dev)}
                <span className="truncate max-w-[110px] text-[11px]">{dev.name.split(' ')[0]}</span>
                {dev.criticality === 'ESSENTIAL' && (
                  <span className="text-[8px] uppercase font-bold text-rose-400 bg-rose-500/20 px-1 rounded">
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
