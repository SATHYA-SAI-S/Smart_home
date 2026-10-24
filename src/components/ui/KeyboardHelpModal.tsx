import React from 'react';
import { X, Keyboard, Eye, Home, Grid, Compass, Move, DoorOpen } from 'lucide-react';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-white/20">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2 text-white">
            <Keyboard size={20} className="text-sky-400" />
            <h2 className="text-base font-bold">SentinelHome Controls & Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* CAMERA VIEWS */}
          <div>
            <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2">
              Camera View Modes
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-200">
                  <Eye size={14} className="text-sky-400" />
                  <span>Person View</span>
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold">1</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-200">
                  <Home size={14} className="text-sky-400" />
                  <span>Room Inspector</span>
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold">2</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-200">
                  <Grid size={14} className="text-sky-400" />
                  <span>Top Floorplan</span>
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold">3</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-200">
                  <Compass size={14} className="text-sky-400" />
                  <span>Orbit Overview</span>
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold">4</kbd>
              </div>
            </div>
          </div>

          {/* AVATAR MOVEMENT & INTERACTION */}
          <div>
            <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2">
              Avatar Movement & Interaction
            </div>
            <div className="space-y-1.5">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-200">
                  <Move size={14} className="text-indigo-400" />
                  <span>Walk Active Avatar (Physics & Collision)</span>
                </span>
                <div className="flex space-x-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">W</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">A</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">S</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">D</kbd>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-200">
                  <DoorOpen size={14} className="text-emerald-400" />
                  <span>Open / Close Nearby Door</span>
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono font-bold">E</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
