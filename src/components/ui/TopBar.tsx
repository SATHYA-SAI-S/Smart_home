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
    { id: 'person', label: 'Person View', icon: <Eye size={15} />, hotkey: '1' },
    { id: 'room', label: 'Room View', icon: <Home size={15} />, hotkey: '2' },
    { id: 'top', label: 'Top View', icon: <Grid size={15} />, hotkey: '3' },
    { id: 'orbit', label: 'Orbit View', icon: <Compass size={15} />, hotkey: '4' },
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
    <header className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      {/* BRAND & LOGO */}
      <div className="glass-panel px-4 py-2 rounded-2xl flex items-center space-x-3 pointer-events-auto shadow-lg">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white flex items-center space-x-1.5">
            <span>SentinelHome</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
              3D Sandbox
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Autonomous Safety Engine</div>
        </div>
      </div>

      {/* VIEW SWITCHER TABS (Hotkeys 1-4) */}
      <div className="glass-panel p-1.5 rounded-2xl flex items-center space-x-1 pointer-events-auto shadow-lg">
        {viewModes.map((v) => {
          const isActive = cameraMode === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setCameraMode(v.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {v.icon}
              <span>{v.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-sky-600/60 text-sky-100' : 'bg-slate-800 text-slate-400'}`}>
                {v.hotkey}
              </span>
            </button>
          );
        })}
      </div>

      {/* ROOM SELECTOR (Visible in Room View) */}
      {cameraMode === 'room' && (
        <div className="glass-panel px-3 py-1.5 rounded-2xl flex items-center space-x-2 pointer-events-auto animate-fade-in shadow-lg">
          <button
            onClick={() => cycleRoom('prev')}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Previous Room"
          >
            <ChevronLeft size={16} />
          </button>

          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="bg-slate-900/90 text-xs font-semibold text-sky-400 border border-slate-700/60 rounded-lg px-2.5 py-1 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => cycleRoom('next')}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Next Room"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* CONTROLS (Time of Day, Cutaway, FOV, Help) */}
      <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-4 pointer-events-auto shadow-lg text-xs">
        {/* TIME OF DAY SLIDER */}
        <div className="flex items-center space-x-2">
          {timeOfDay >= 6 && timeOfDay <= 18 ? (
            <Sun size={15} className="text-amber-400" />
          ) : (
            <Moon size={15} className="text-sky-300" />
          )}
          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <span className="font-mono text-slate-300 text-[11px] w-10">
            {Math.floor(timeOfDay).toString().padStart(2, '0')}:
            {((timeOfDay % 1) * 60 === 30 ? '30' : '00')}
          </span>
        </div>

        {/* ROOF CUTAWAY TOGGLE */}
        <button
          onClick={() => setRoofCutaway(!roofCutaway)}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            roofCutaway
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Interior Cutaway Roof"
        >
          {roofCutaway ? 'Roof Cutaway' : 'Full Roof'}
        </button>

        {/* FOV SLIDER (in Person View) */}
        {cameraMode === 'person' && (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowFovSlider(!showFovSlider)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Camera Field of View"
            >
              <Sliders size={14} />
            </button>
            {showFovSlider && (
              <div className="flex items-center space-x-1.5">
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={fov}
                  onChange={(e) => setFov(parseInt(e.target.value))}
                  className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <span className="text-[10px] text-slate-400 font-mono">{fov}°</span>
              </div>
            )}
          </div>
        )}

        {/* KEYBOARD SHORTCUTS HELP MODAL TOGGLE */}
        <button
          onClick={onToggleHelp}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          title="Keyboard Shortcuts Legend"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
};
