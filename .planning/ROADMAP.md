# SentinelHome Project Roadmap

## Phase 1: Project Scaffold, Spec & Build Pipeline
- [x] Architecture Specification (`SPEC.md`)
- [ ] Dependencies installation & verification
- [ ] Vite, TypeScript, Tailwind, Vitest configuration
- [ ] Express Gemini backend proxy (`server/index.js` or `server/server.ts`)
- [ ] Initial project skeleton & clean build check
- [ ] Phase 1 Git Commit

## Phase 2: Procedural 3D Modern House Architecture
- [ ] 7 distinct rooms & outdoor zones (Main Hall, Bedroom, Bathroom, Kitchen, Garage, Terrace, Lawn)
- [ ] Procedural furniture per room (PBR materials, RoundedBox, warm palette, wood/stone/tiles)
- [ ] Working animated doors with hinges, state indicators, and locks
- [ ] Dynamic roof cutaway / wall auto-fade for top view & room inspector
- [ ] Zone detection coordinates & 3D room billboard tags
- [ ] High-fidelity lighting: day/night ambient, directional sun, point lights, ACES tone mapping, bloom
- [ ] Phase 2 Git Commit

## Phase 3: People, Physics, Movement & Cameras
- [ ] Procedural articulated humanoids ("You", "Grandpa", "Kid") with limb swing walking animations
- [ ] WASD / Arrow keys + Mouse Look first-person controller with collision detection
- [ ] NPC autonomous waypoint pathfinding with idle intervals and scripted scenarios
- [ ] Per-frame room occupancy tracking engine
- [ ] 4 View Modes (1: First-Person, 2: Room Inspector, 3: Top-Down 2D/3D Floorplan, 4: Orbit Overview)
- [ ] Smooth camera tweening between modes + Person view minimap
- [ ] Phase 3 Git Commit

## Phase 4: Device Simulation & Visual Feedback Engine
- [ ] Device registry covering all required device types across all 7 zones
- [ ] Dynamic visual feedback: lights illuminate, ceiling fans spin, AC cool particles/glow, stove burner heat, TV glow, door lock color states
- [ ] Criticality tiers (ESSENTIAL, SAFETY, COMFORT, SECURITY, ENERGY)
- [ ] Phase 4 Git Commit

## Phase 5: Autonomous Contextual Agent & Safety Policy Engine
- [ ] Declarative Device Capability Schema & World Model single source of truth
- [ ] Natural Language Interpreter (Gemini Function Calling + Resilient Offline NLP Parser)
- [ ] Dependency-aware Action Planner
- [ ] Sandbox Simulator with cascading effect detection (e.g., Main Breaker -> Refrigerator & Medical)
- [ ] Dual-layer Safety & Policy Engine (Absolute Invariants + Soft Risk Formula)
- [ ] Recommender with Pareto-safe plan generation & alternative choices
- [ ] Autonomy Confirmation Gate (Ask-Always, Ask-on-Risk, Auto-Safe)
- [ ] Animated Executor with Verification readback and single-click Undo
- [ ] Memory, learned preferences, and runtime rule editor
- [ ] Phase 5 Git Commit

## Phase 6: UI/UX Modern Glass Panels & Interactive Controls
- [ ] Glassmorphic HUD overlay (Tailwind + Lucide)
- [ ] 5-Tab Agent Panel (Chat with 6-stage stepper, Plan & Approval diff, World & Risks live meter, Rules & Memory editor, Audit Log)
- [ ] Room Inspector panel & live device status bottom strip
- [ ] Time-of-day slider, FOV slider, speaker selector, autonomy dropdown, quick scenarios menu
- [ ] 3D Canvas visual indicators (plan change halos, ghost previews, blocked action hazard markers)
- [ ] Phase 6 Git Commit

## Phase 7: Comprehensive Testing, DevTools Verification & Final Review
- [ ] Unit tests for all hard invariants and risk rules (Vitest)
- [ ] Property-based testing with fast-check across randomized home topologies & commands
- [ ] 25+ Scenario verification suite (ambiguities, typos, child speaker, power outage, adversarial attacks)
- [ ] DevTools MCP automation: zero console errors, 60 FPS verification, screenshots for all 4 views
- [ ] CodeRabbit review pass & documentation in README
- [ ] Final Git Commit
