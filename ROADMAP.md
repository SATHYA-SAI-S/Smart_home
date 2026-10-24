# SentinelHome Roadmap (GSD Framework)

## Phase 1: Core 3D World & Safety Invariants [COMPLETED]
- [x] 1.1 Procedural 3D scene & bounding-box room occupancy tracking
- [x] 1.2 8 Core Safety Invariants & Pool Filter Swimmer Safety Policy
- [x] 1.3 6-Stage Reasoning & Policy Verification Stepper
- [x] 1.4 Camera system (Person, Room, Top, Orbit modes)

## Phase 2: Whisper Voice Input & Resilient Speech Pipeline [COMPLETED]
- [x] 2.1 Integrate local OpenAI Whisper backend runner (`server/transcribe.py`)
- [x] 2.2 Fix base64 codec sanitization & MIME extension handling in `server/index.js`
- [x] 2.3 Bulletproof error propagation and empty audio guards in `server/transcribe.py`
- [x] 2.4 Enhance frontend voice capture resilience, interim WebSpeech fallback, and UX in `ChatTab.tsx`
- [x] 2.5 Automated end-to-end verification gate (`vitest` + audio pipeline tests)

## Phase 3: Multi-Agent Interactive Behaviors & Advanced Presets [UPCOMING]
- [ ] 3.1 Autonomous NPC daily routine routines (Grandpa morning stroll, Kid play session)
- [ ] 3.2 Dynamic voice feedback response audio (TTS synthesis)
