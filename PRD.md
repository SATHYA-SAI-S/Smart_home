# SentinelHome PRD: Voice Input Subsystem

## Objective
Provide accurate, private, local speech-to-text (STT) using open-source OpenAI Whisper on macOS, seamlessly forwarding transcribed natural language to Gemini for contextual intent extraction and the 6-stage safety reasoning pipeline.

## Requirements
- [x] REQ-1: Zero-cost, 100% local speech-to-text using open-source OpenAI Whisper (no paid cloud speech APIs).
- [x] REQ-2: Resilient audio decoding supporting all browser audio MIME formats (`webm;codecs=opus`, `audio/mp4`, `audio/ogg`, `audio/wav`).
- [ ] REQ-3: Robust base64 stripping preventing audio header corruption.
- [ ] REQ-4: Complete error transparency between Python child process and Node.js Express server.
- [ ] REQ-5: Graceful fallback to browser Web Speech API if Whisper processing is unavailable.
- [ ] REQ-6: Pass all 45 automated unit/property tests with 100% success rate.
