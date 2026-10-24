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
                <strong className="text-white">WASD</strong> (W: Front • S: Back • A: Left • D: Right)
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-sky-300">Move Mouse / Drag</strong> 360° Look Around
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-emerald-300">Space</strong> Jump
              </span>
              <span className="text-slate-500">•</span>
              <span>
                <strong className="text-amber-300">F</strong> Door
              </span>
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
