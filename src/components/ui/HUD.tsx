import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel/RightPanel';
import { BottomDeviceStrip } from './BottomDeviceStrip';
import { Minimap } from '../3d/Cameras/Minimap';
import { KeyboardHelpModal } from './KeyboardHelpModal';
import { useWorldStore } from '../../store/useWorldStore';

export const HUD: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
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
      <LeftPanel />
      <RightPanel />
      <BottomDeviceStrip />
      <Minimap />
      <KeyboardHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
