import React, { useState } from 'react';
import { useWorldStore } from '../../../store/useWorldStore';
import { Compass, Minimize2, Maximize2 } from 'lucide-react';

export const Minimap: React.FC = () => {
  const [minimized, setMinimized] = useState(false);
  const rooms = useWorldStore((state) => state.rooms);
  const people = useWorldStore((state) => state.people);
  const doors = useWorldStore((state) => state.doors);
  const selectedPersonId = useWorldStore((state) => state.selectedPersonId);
  const cameraMode = useWorldStore((state) => state.cameraMode);

  if (cameraMode !== 'person') return null;

  // Coordinate mapping: World [-14, 16] -> SVG [0, 200], Z [-8, 20] -> SVG [0, 186]
  const mapX = (x: number) => ((x + 14) / 30) * 200;
  const mapZ = (z: number) => ((z + 8) / 28) * 186;

  const activePerson = people.find((p) => p.id === selectedPersonId);

  return (
    <div className="absolute top-16 left-80 z-20 pointer-events-auto">
      <div className="glass-panel p-2.5 rounded-2xl shadow-2xl border border-white/10 w-52 flex flex-col transition-all duration-200">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center space-x-1.5">
            <Compass size={12} className="text-sky-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Radar</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[70px]">{activePerson?.name}</span>
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
              title={minimized ? 'Expand Radar' : 'Minimize Radar'}
            >
              {minimized ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="relative h-44 bg-slate-950/80 rounded-xl overflow-hidden border border-white/5">
            <svg viewBox="0 0 200 186" className="w-full h-full">
              {/* Rooms */}
              {rooms.map((room) => {
                const rx = mapX(room.bounds.min[0]);
                const rz = mapZ(room.bounds.min[2]);
                const rw = mapX(room.bounds.max[0]) - rx;
                const rh = mapZ(room.bounds.max[2]) - rz;

                return (
                  <g key={`minimap_room_${room.id}`}>
                    <rect
                      x={rx}
                      y={rz}
                      width={rw}
                      height={rh}
                      fill={room.id === activePerson?.currentRoom ? 'rgba(56, 189, 248, 0.22)' : 'rgba(30, 41, 59, 0.45)'}
                      stroke="rgba(148, 163, 184, 0.25)"
                      strokeWidth="1"
                    />
                    <text
                      x={rx + rw / 2}
                      y={rz + rh / 2 + 3}
                      textAnchor="middle"
                      fill="rgba(203, 213, 225, 0.6)"
                      fontSize="7"
                      fontWeight="600"
                    >
                      {room.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Doors */}
              {doors.map((door) => {
                const dx = mapX(door.position[0]);
                const dz = mapZ(door.position[2]);
                return (
                  <circle
                    key={`minimap_door_${door.id}`}
                    cx={dx}
                    cy={dz}
                    r={door.isOpen ? 2 : 2.5}
                    fill={door.isLocked ? '#ef4444' : door.isOpen ? '#22c55e' : '#f59e0b'}
                  />
                );
              })}

              {/* People */}
              {people.map((person) => {
                const px = mapX(person.position[0]);
                const pz = mapZ(person.position[2]);
                const isMe = person.id === selectedPersonId;

                return (
                  <g key={`minimap_person_${person.id}`}>
                    {isMe && (
                      <circle
                        cx={px}
                        cy={pz}
                        r={7}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="2,2"
                      />
                    )}
                    <circle
                      cx={px}
                      cy={pz}
                      r={isMe ? 3.5 : 2.8}
                      fill={person.color}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
