import React from 'react';
import { HouseCanvas } from './components/3d/HouseCanvas';
import { HUD } from './components/ui/HUD';

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Layer */}
      <HouseCanvas />

      {/* Glassmorphic UI HUD Overlay Layer */}
      <HUD />
    </div>
  );
}
