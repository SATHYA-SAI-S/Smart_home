import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  MapPin, 
  Play, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2,
  Activity,
  Footprints
} from 'lucide-react';
import { useWorldStore } from '../../store/useWorldStore';
import { PersonEntity } from '../../types/world';

export const LeftPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const people = useWorldStore((state) => state.people);
  const selectedPersonId = useWorldStore((state) => state.selectedPersonId);
  const setSelectedPersonId = useWorldStore((state) => state.setSelectedPersonId);
  const updatePersonPosition = useWorldStore((state) => state.updatePersonPosition);
  const updatePersonActivity = useWorldStore((state) => state.updatePersonActivity);
  const addPerson = useWorldStore((state) => state.addPerson);
  const removePerson = useWorldStore((state) => state.removePerson);
  const rooms = useWorldStore((state) => state.rooms);

  // Scripted NPC Scenarios
  const triggerScript = (scenario: string) => {
    if (scenario === 'grandpa_bathroom') {
      const grandpa = people.find((p) => p.name === 'Grandpa');
      if (grandpa) {
        grandpa.scriptedRoutine = 'stay_in_bathroom';
        updatePersonPosition(grandpa.id, [-8.0, 0, -4.0], 0);
        updatePersonActivity(grandpa.id, 'bathing');
      }
    } else if (scenario === 'grandpa_bedroom') {
      const grandpa = people.find((p) => p.name === 'Grandpa');
      if (grandpa) {
        grandpa.scriptedRoutine = null;
        updatePersonPosition(grandpa.id, [1.0, 0, -4.0], 0);
        updatePersonActivity(grandpa.id, 'resting');
      }
    } else if (scenario === 'reset_all') {
      people.forEach((p) => {
        p.scriptedRoutine = null;
        if (p.name === 'You') updatePersonPosition(p.id, [1.0, 0, 4.0], 0);
        if (p.name === 'Grandpa') updatePersonPosition(p.id, [3.5, 0, 3.2], -Math.PI / 4);
        if (p.name === 'Kid') updatePersonPosition(p.id, [10.0, 0, 4.5], Math.PI / 2);
        updatePersonActivity(p.id, 'idle');
      });
    }
  };

  const handleAddNewGuest = () => {
    const id = `person_guest_${Date.now()}`;
    const newGuest: PersonEntity = {
      id,
      name: `Guest ${people.length + 1}`,
      color: '#ec4899', // Pink
      attributes: {
        ageGroup: 'adult',
        mobility: 'high',
        vulnerability: 0.2,
        role: 'guest',
      },
      position: [1.0, 0, 15.0], // Starts outside on lawn path
      rotationY: 0,
      currentRoom: 'lawn',
      activity: 'walking',
      isControlled: false,
      pathWaypoints: [
        [1.0, 0, 15.0],
        [1.0, 0, 8.5],
        [1.0, 0, 4.0],
      ],
      targetWaypointIndex: 0,
      idleTimer: 4,
    };
    addPerson(newGuest);
  };

  return (
    <div
      className={`absolute left-4 top-16 bottom-24 z-20 transition-all duration-300 flex pointer-events-auto ${
        collapsed ? '-translate-x-[calc(100%-14px)]' : 'translate-x-0'
      }`}
    >
      <div className="glass-panel w-72 rounded-2xl p-4 flex flex-col justify-between shadow-2xl overflow-y-auto border border-white/10">
        <div>
          {/* PANEL HEADER */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center space-x-2 text-white">
              <Users size={15} className="text-sky-400" />
              <span className="text-xs font-bold tracking-tight uppercase">Inhabitants</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {people.length}
              </span>
            </div>
            <button
              onClick={handleAddNewGuest}
              className="p-1 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/20 transition text-[11px] flex items-center space-x-1 px-2.5 font-medium"
              title="Add Guest Inhabitant"
            >
              <Plus size={12} />
              <span>Guest</span>
            </button>
          </div>

          {/* PEOPLE LIST */}
          <div className="space-y-2 mb-4">
            {people.map((person) => {
              const isSelected = person.id === selectedPersonId;
              const roomName =
                rooms.find((r) => r.id === person.currentRoom)?.name || person.currentRoom;

              return (
                <div
                  key={person.id}
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 border-sky-500/50 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-900/50 border-white/5 hover:border-white/15 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {/* Person Avatar Colored Glyph */}
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                        <span>{person.name}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1 rounded bg-sky-500/30 text-sky-300 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                        <MapPin size={9} className="text-slate-500" />
                        <span className="truncate max-w-[90px]">{roomName}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-mono">[{person.activity}]</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Mobility / Age Badge */}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        person.attributes.vulnerability > 0.6
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {person.attributes.ageGroup}
                    </span>

                    {/* Delete button for extra people */}
                    {people.length > 2 && person.id.startsWith('person_guest') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePerson(person.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ACTIVE CONTROLLER NOTICE */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 text-[11px] text-slate-300 mb-4 flex items-center space-x-2">
            <UserCheck size={14} className="text-sky-400 shrink-0" />
            <div className="text-[10px] leading-tight text-slate-400">
              Controlling: <strong className="text-sky-300">{people.find((p) => p.id === selectedPersonId)?.name}</strong>
              <div className="mt-0.5 text-slate-500">Press <span className="text-slate-300">WASD / Arrows</span> to walk</div>
            </div>
          </div>

          {/* SCRIPTED NPC SCENARIOS */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
              <Activity size={12} className="text-indigo-400" />
              <span>Simulated Presets</span>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => triggerScript('grandpa_bathroom')}
                className="w-full text-left p-2 rounded-xl bg-slate-900/50 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 hover:text-white transition flex items-center justify-between"
              >
                <span>Grandpa stays in Bathroom</span>
                <Play size={11} className="text-sky-400" />
              </button>
              <button
                onClick={() => triggerScript('grandpa_bedroom')}
                className="w-full text-left p-2 rounded-xl bg-slate-900/50 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 hover:text-white transition flex items-center justify-between"
              >
                <span>Grandpa rests in Bedroom</span>
                <Play size={11} className="text-sky-400" />
              </button>
              <button
                onClick={() => triggerScript('reset_all')}
                className="w-full text-left p-2 rounded-xl bg-slate-900/50 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 hover:text-white transition flex items-center justify-between"
              >
                <span>Reset All Positions</span>
                <RotateCcw size={11} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER STATUS */}
        <div className="pt-2.5 border-t border-white/10 text-[9px] text-slate-500 flex justify-between">
          <span>Safety Engine: 60 FPS</span>
          <span>Collision: Solid</span>
        </div>
      </div>

      {/* COLLAPSE / EXPAND TOGGLE TAB */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-5 h-12 my-auto -mr-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white rounded-r-xl border-y border-r border-white/15 flex items-center justify-center transition shadow-xl"
        title={collapsed ? 'Expand Inhabitants Panel' : 'Collapse Panel'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  );
};
