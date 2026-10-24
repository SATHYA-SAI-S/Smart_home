# SentinelHome: Specification & Architectural Blueprint

## 1. Executive Overview
SentinelHome is a sandboxed, browser-based 3D smart-home simulator powered by an autonomous contextual AI Agent.
Unlike standard voice assistants (which simply map rigid triggers to device toggles), SentinelHome uses a formal **World Model**, a multi-stage **Reasoning & Policy Pipeline**, and a **Predictive Simulation Engine** to assess real-world context, foresee unintended cascading consequences, evaluate safety & invariant policies, propose safer alternatives, request human approval when appropriate, and execute with closed-loop verification.

Everything runs in a simulated 3D environment with procedural geometry, physical collision boundaries, multiple autonomous/user-controlled people, real working animated doors/locks, and responsive device states.

---

## 2. Tech Stack & Execution Environment
- **Frontend Core**: Vite, React 18, TypeScript
- **3D Graphics & Physics**: Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
  - ACESFilmicToneMapping, soft shadows, bloom, SSAO/N8AO depth effects.
  - Zero external 3D asset dependencies; 100% procedural geometry, RoundedBox, and PBR materials for reliable offline operation.
- **State Management**: Zustand
- **Styling & UI**: Tailwind CSS, Lucide React
- **Testing**: Vitest, `@testing-library/react`, `fast-check` (Property-Based Testing)
- **Backend Proxy**: Lightweight Express server reading `GEMINI_API_KEY` from `.env` (never exposed to client bundle).
- **Offline Fallback**: Resilient, rule-based NLP intent extractor and synonym resolver that works completely offline if no Gemini API key is provided.

---

## 3. Seven Architectural Areas (Rooms & Zones)
1. **Main Hall** (Living room with sofa, coffee table, entertainment center, TV, central lights, ceiling fan, main entrance door & lock, security camera).
2. **Bedroom** (Bed, wardrobe, side tables, lamps, smart plugs, AC unit, bedroom door & lock).
3. **Bathroom** (Toilet, wash basin, walk-in shower, water heater, bathroom door with inside latch & outside lock state).
4. **Kitchen** (Countertops, induction stove/oven with burner glow, refrigerator [ESSENTIAL], smart microwave plug, kitchen door & lock).
5. **Garage** (Car silhouette, tools rack, motorized garage door, garage lock, main electrical panel [ESSENTIAL]).
6. **Terrace** (Outdoor chairs, coffee table, terrace perimeter railing, sliding glass door with lock).
7. **Lawn** (Garden grass, walking stone path, procedural trees, perimeter fence, front gate, smart outdoor path floodlights).

Each room features:
- Axis-aligned 3D bounding volume for continuous, per-frame occupancy calculation.
- Auto-fading / cutaway roof & upper walls during top-down and room inspection modes.
- Visual billboard label for room identity.

---

## 4. Multi-Agent & People Simulation
- **Stylized Procedural Humanoids**: Articulated capsule/rounded mesh with animated swinging limbs.
- **Default Inhabitants**:
  - `You` (Adult, controllable via WASD + mouse look, or direct click/selection).
  - `Grandpa` (Elderly adult, slower movement, high vulnerability profile, autonomous NPC pathfinding).
  - `Kid` (Child, fast erratic movement, restricted permissions, autonomous NPC).
- **Collision & Navigation**:
  - Continuous collision detection with static walls and furniture bounding boxes.
  - Interactive doors (`E` key or agent command) with physical collision toggle when open/closed.
  - Waypoint graph for NPCs with idle pauses and scripted scenario hooks.
- **Occupancy Engine**:
  - Real-time tracking of every entity's `(x, y, z)` location mapped to room zones.

---

## 5. Camera & View System (Hotkeys 1–4)
1. **Person View (1)**: First-person camera aligned precisely with selected avatar's eye height. Smooth mouse look, FOV adjustment, and active minimap overlay.
2. **Room View (2)**: Fixed-angle security/inspection corner cameras per room. Includes Room Inspector drawer with device list, power state, and occupant list.
3. **Top View (3)**: Orthographic architectural floor plan. Roof hidden, colored occupant markers, device status glyphs, and lock state indicators.
4. **Orbit / Overview (4)**: Smooth orbital camera with pan, tilt, zoom around the entire residence.
- Camera transitions use smooth tweening (lerp/spherical interpolation) for seamless UX.

---

## 6. Device Capability & State Schema
Every device is defined declaratively:
```json
{
  "id": "kitchen_fridge",
  "name": "Kitchen Refrigerator",
  "type": "refrigerator",
  "room": "kitchen",
  "criticality": "ESSENTIAL",
  "power": "on",
  "capabilities": {
    "toggle_power": {
      "preconditions": {},
      "effects": { "power": "toggle" },
      "hazards": ["spoilage_food", "essential_power_loss"],
      "reversibility": "HIGH"
    }
  }
}
```
### Criticality Tiers:
- `ESSENTIAL`: Refrigerator, Main Circuit Breaker, Medical Plugs. **Hard Invariant: Never turn off automatically or under standard commands.**
- `SAFETY`: Induction Stove, Water Heater, Main Entrance Locks.
- `SECURITY`: Perimeter Cameras, Front Gate, Garage Door.
- `COMFORT`: Ceiling Fans, Air Conditioners, Ambient TV, Interior Accent Lights.
- `ENERGY`: Standard Smart Plugs, Decorative Lighting.

---

## 7. 10-Module Agent Safety Architecture
1. **World Model**: Single source of truth (Rooms, Devices, Doors, People, Environmental Context).
2. **Interpreter**: Gemini LLM structured JSON output + Offline Fallback NLP. Maps unstructured natural language to semantic Goals and Constraints without hardcoded device IDs.
3. **Planner**: Goal-backward search matching device capability preconditions/effects to synthesize ordered action sequences.
4. **Simulator**: Virtual sandbox clone. Simulates plan execution to detect cascading side effects (e.g., flipping Main Switch shuts off Fridge, Routers, Cameras).
5. **Risk & Policy Engine**:
   - **Hard Invariants**: Absolute constraints that can NEVER be violated:
     - No shutting off `ESSENTIAL` devices.
     - No locking doors with occupants trapped inside or behind.
     - No locking an open or obstructed door.
   - **Soft Risk Scoring Formula**:
     $$\text{Risk Score} = \text{Severity} \times \text{Likelihood} \times \text{Vulnerability} \times \text{Irreversibility}$$
6. **Recommender**: Generates the Pareto-optimal safe plan, pruning unsafe actions, substituting safer alternatives, and compiling human-readable explanations.
7. **Confirmation Gate**: Autonomy gating (`Always Ask`, `Ask on Risk`, `Autonomous Safe`).
8. **Executor & Verifier**: Sequenced execution with 3D animation, telemetry readback, and automated rollback if post-conditions fail.
9. **Memory & Adaptation**: Household preference accumulation and runtime rule editor.
10. **Explainer & Audit Log**: 6-stage stepper (Understand -> Simulate -> Analyze -> Recommend -> Confirm -> Execute/Verify) with full JSON export.

---

## 8. Verification & Test Backpressure Plan
- Comprehensive Vitest unit tests for all hard invariants and soft risk heuristics.
- Fast-check property-based testing across random house configurations, occupant locations, and arbitrary commands.
- 25+ Scenario Suite covering edge cases (mispronunciations, conflicting commands, child voice, power grid simulation, unattended stove hazard).
- Chrome DevTools MCP automation: live console log validation, 60 FPS performance verification, and automated screenshots across all 4 camera modes.
