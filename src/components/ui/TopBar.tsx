import React, { useState } from 'react';
import { 
  Eye, 
  Home, 
  Grid, 
  Compass, 
  Sun, 
  Moon, 
  Sliders, 
  HelpCircle, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useWorldStore } from '../../store/useWorldStore';
import { CameraViewMode } from '../../types/world';

interface TopBarProps {
  onToggleHelp: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleHelp }) => {
  const cameraMode = useWorldStore((state) => state.cameraMode);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);
  const selectedRoomId = useWorldStore((state) => state.selectedRoomId);
  const setSelectedRoomId = useWorldStore((state) => state.setSelectedRoomId);
  const rooms = useWorldStore((state) => state.rooms);
  const timeOfDay = useWorldStore((state) => state.timeOfDay);
  const setTimeOfDay = useWorldStore((state) => state.setTimeOfDay);
  const fov = useWorldStore((state) => state.fov);
  const setFov = useWorldStore((state) => state.setFov);
  const roofCutaway = useWorldStore((state) => state.roofCutaway);
  const setRoofCutaway = useWorldStore((state) => state.setRoofCutaway);

  const [showFovSlider, setShowFovSlider] = useState(false);

  const viewModes: { id: CameraViewMode; label: string; icon: React.ReactNode; hotkey: string }[] = [
    { id: 'person', label: '3rd Person', icon: <Eye size={14} />, hotkey: '1' },
    { id: 'room', label: 'Room Cam', icon: <Home size={14} />, hotkey: '2' },
    { id: 'top', label: 'Top-Down', icon: <Grid size={14} />, hotkey: '3' },
    { id: 'orbit', label: 'Orbit 3D', icon: <Compass size={14} />, hotkey: '4' },
  ];

  const currentRoomIndex = rooms.findIndex((r) => r.id === selectedRoomId);

  const cycleRoom = (direction: 'next' | 'prev') => {
    let nextIdx = direction === 'next' ? currentRoomIndex + 1 : currentRoomIndex - 1;
    if (nextIdx >= rooms.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = rooms.length - 1;
    setSelectedRoomId(rooms[nextIdx].id);
    if (cameraMode !== 'room') setCameraMode('room');
  };

  return (
    <header className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-3">
      {/* BRAND & STATUS BADGE */}
      <div className="glass-panel px-3.5 py-2 rounded-2xl flex items-center space-x-3 pointer-events-auto shadow-2xl transition hover:border-sky-500/30">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div>
          <div className="text-xs font-bold tracking-tight text-white flex items-center space-x-1.5">
            <span>SentinelHome</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Smart Space Simulator</div>
        </div>
      </div>

      {/* VIEW SWITCHER CAPSULE (Hotkeys 1-4) */}
      <div className="glass-panel p-1 rounded-2xl flex items-center space-x-1 pointer-events-auto shadow-2xl">
        {viewModes.map((v) => {
          const isActive = cameraMode === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setCameraMode(v.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold shadow-md shadow-sky-500/25 border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {v.icon}
              <span>{v.label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isActive ? 'bg-black/30 text-white' : 'bg-slate-800/80 text-slate-400'
              }`}>
                {v.hotkey}
              </span>
            </button>
          );
        })}

        {/* ROOM PICKER (In Room Cam Mode) */}
        {cameraMode === 'room' && (
          <div className="flex items-center space-x-1 pl-1.5 border-l border-white/10 ml-1">
            <button
              onClick={() => cycleRoom('prev')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Previous Room"
            >
              <ChevronLeft size={14} />
            </button>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-slate-900/90 text-xs font-semibold text-sky-400 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => cycleRoom('next')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Next Room"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* QUICK CONTROLS (Time of Day, Roof, FOV, Help) */}
      <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-3 pointer-events-auto shadow-2xl text-xs">
        {/* TIME OF DAY SLIDER */}
        <div className="flex items-center space-x-2">
          {timeOfDay >= 6 && timeOfDay <= 18 ? (
            <Sun size={14} className="text-amber-400" />
          ) : (
            <Moon size={14} className="text-sky-300" />
          )}
          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-18 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            title="Adjust Sun / Time of Day"
          />
          <span className="font-mono text-slate-300 text-[11px] w-9">
            {Math.floor(timeOfDay).toString().padStart(2, '0')}:
            {((timeOfDay % 1) * 60 === 30 ? '30' : '00')}
          </span>
        </div>

        {/* ROOF CUTAWAY TOGGLE */}
        <button
          onClick={() => setRoofCutaway(!roofCutaway)}
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition ${
            roofCutaway
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
          title="Toggle Interior Cutaway Roof"
        >
          {roofCutaway ? 'Cutaway Roof' : 'Full Roof'}
        </button>

        {/* FOV SLIDER (in 3rd Person View) */}
        {cameraMode === 'person' && (
          <div className="flex items-center space-x-1.5 border-l border-white/10 pl-2">
            <button
              onClick={() => setShowFovSlider(!showFovSlider)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              title="Camera Field of View"
            >
              <Sliders size={13} />
            </button>
            {showFovSlider && (
              <div className="flex items-center space-x-1.5">
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={fov}
                  onChange={(e) => setFov(parseInt(e.target.value))}
                  className="w-14 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <span className="text-[10px] text-slate-400 font-mono">{fov}°</span>
              </div>
            )}
          </div>
        )}

        {/* KEYBOARD SHORTCUTS HELP MODAL TOGGLE */}
        <button
          onClick={onToggleHelp}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          title="Keyboard Shortcuts Legend"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
};
