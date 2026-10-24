import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel/RightPanel';
import { BottomDeviceStrip } from './BottomDeviceStrip';
import { Minimap } from '../3d/Cameras/Minimap';
import { KeyboardHelpModal } from './KeyboardHelpModal';
import { useWorldStore } from '../../store/useWorldStore';
import { Navigation, MousePointer, Info } from 'lucide-react';

export const HUD: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const cameraMode = useWorldStore((state) => state.cameraMode);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);
  const isPointerLocked = useWorldStore((state) => state.isPointerLocked);

  // Global hotkeys 1, 2, 3, 4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === '1') setCameraMode('person');
      if (e.key === '2') setCameraMode('room');
      if (e.key === '3') setCameraMode('top');
      if (e.key === '4') setCameraMode('orbit');
      if (e.key === '?' || (e.shiftKey && e.key === '/')) setShowHelp((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCameraMode]);

  return (
    <>
      <TopBar onToggleHelp={() => setShowHelp(true)} />
      
      {/* FLOATING CONTEXT-AWARE CONTROL HINT PILL */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="glass-pill px-3.5 py-1 rounded-full text-[11px] text-slate-300 flex items-center space-x-2 shadow-lg border border-white/10 animate-fade-in">
          {cameraMode === 'person' ? (
            <>
              <Navigation size={12} className="text-sky-400" />
              <span>
                <strong className="text-white">WASD</strong> Move
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-sky-300">Mouse</strong> Look 360°
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-emerald-300">Space</strong> Jump
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-amber-300">F</strong> Door
              </span>
              <span className="text-slate-500">•</span>
              <button
                onClick={() => {
                  const canvas = document.querySelector('canvas');
                  if (!canvas) return;
                  if (document.pointerLockElement === canvas) {
                    document.exitPointerLock?.();
                  } else {
                    canvas.requestPointerLock?.();
                  }
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold pointer-events-auto transition cursor-pointer flex items-center space-x-1 ${
                  isPointerLocked
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:bg-amber-500/40'
                    : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/40'
                }`}
                title="Press F1 or Click to toggle Free Mouse Cursor / 360° Mouse Look"
              >
                <span>F1</span>
                <span>{isPointerLocked ? 'Unlock Cursor' : 'Lock Cursor'}</span>
              </button>
            </>
          ) : cameraMode === 'orbit' ? (
            <>
              <MousePointer size={12} className="text-sky-400" />
              <span>
                <strong className="text-white">Left Click + Drag</strong> Orbit
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-white">Right Click</strong> Pan
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-white">Scroll</strong> Zoom
              </span>
            </>
          ) : cameraMode === 'room' ? (
            <>
              <Info size={12} className="text-sky-400" />
              <span>Room Camera View • Use Room dropdown in top bar to switch</span>
            </>
          ) : (
            <>
              <Info size={12} className="text-sky-400" />
              <span>Top-Down Floorplan View • Inspect entire architectural layout</span>
            </>
          )}
        </div>
      </div>

      <LeftPanel />
      <RightPanel />
      <BottomDeviceStrip />
      <Minimap />
      <KeyboardHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
