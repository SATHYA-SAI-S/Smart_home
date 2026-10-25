import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const apiKey = process.env.GEMINI_API_KEY?.trim();
const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';
let aiClient = null;

const OLLAMA_HOST = process.env.OLLAMA_HOST?.trim() || 'http://127.0.0.1:11434';
const PREFER_OLLAMA = process.env.PREFER_OLLAMA === 'true';
const OLLAMA_PREFERRED_MODEL = process.env.OLLAMA_MODEL?.trim() || 'qwen2.5:0.5b';

if (apiKey && apiKey.length > 5) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log(`[SentinelServer] Gemini client initialized with model: ${modelName}`);
  } catch (err) {
    console.warn('[SentinelServer] Failed to initialize GoogleGenAI:', err.message);
  }
} else {
  console.log('[SentinelServer] No GEMINI_API_KEY found in environment. System will utilize local Ollama or Offline Fallback.');
}

// Auto-start Ollama daemon if installed but not active
async function ensureOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      console.log(`[SentinelServer] Local Ollama service is active at ${OLLAMA_HOST}`);
      return true;
    }
  } catch (_) {}

  const ollamaBin = '/usr/local/bin/ollama';
  if (fs.existsSync(ollamaBin)) {
    try {
      console.log('[SentinelServer] Launching local Ollama background daemon...');
      const proc = spawn(ollamaBin, ['serve'], { detached: true, stdio: 'ignore' });
      proc.unref();
      await new Promise((r) => setTimeout(r, 2000));
      return true;
    } catch (e) {
      console.warn('[SentinelServer] Auto-launch Ollama failed:', e.message);
    }
  }
  return false;
}
ensureOllamaRunning();

// Query local Ollama with lightweight model and strict timeout
async function queryOllamaIntent(prompt, worldSummary, speaker) {
  const timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const tagsRes = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: controller.signal });
    if (!tagsRes.ok) return null;
    const tagsData = await tagsRes.json();
    const available = (tagsData.models || []).map((m) => m.name || m.model);
    if (!available || available.length === 0) return null;

    const priorityList = [
      OLLAMA_PREFERRED_MODEL,
      'qwen2.5:0.5b',
      'gemma:2b',
      'deepseek-r1:8b',
      available[0],
    ];
    let selectedModel = available[0];
    for (const pref of priorityList) {
      const match = available.find((m) => m === pref || m.startsWith(pref.split(':')[0]));
      if (match) {
        selectedModel = match;
        break;
      }
    }

    console.log(`[SentinelServer] Querying local Ollama model: ${selectedModel}`);

    const systemPrompt = `You are the Interpreter module for SentinelHome, an autonomous 3D smart-home safety agent.
Parse user commands into a valid JSON Intent object.
Return ONLY valid JSON matching this exact structure:
{
  "goal": "leave_home" | "prepare_sleep" | "make_cozy" | "cook_mode" | "turn_off_devices" | "turn_on_devices" | "inspect_safety" | "custom_action",
  "scope": "all" | "kitchen" | "hall" | "bedroom" | "bathroom" | "garage" | "pool" | "lawn" | "lights" | "fan" | "ac" | "doors",
  "speaker": "${speaker || 'You'}",
  "urgency": "LOW" | "NORMAL" | "HIGH" | "EMERGENCY",
  "constraints": [],
  "confidence": 0.9,
  "ambiguities": [],
  "rawUnderstanding": "brief deduction summary"
}`;

    const promptPayload = `${systemPrompt}\n\nCommand: "${prompt}"\nSpeaker: ${speaker || 'You'}\nJSON:`;

    const genRes = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        prompt: promptPayload,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 200,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!genRes.ok) return null;
    const genData = await genRes.json();
    if (!genData.response) return null;

    const parsed = JSON.parse(genData.response.trim());
    return {
      intent: {
        goal: parsed.goal || 'custom_action',
        scope: parsed.scope || 'all',
        speaker: parsed.speaker || speaker || 'You',
        urgency: ['LOW', 'NORMAL', 'HIGH', 'EMERGENCY'].includes(parsed.urgency) ? parsed.urgency : 'NORMAL',
        constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.88,
        ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
        rawUnderstanding: `[Ollama ${selectedModel}] ${parsed.rawUnderstanding || parsed.goal || 'Parsed intent'}`,
      },
      model: selectedModel,
    };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[SentinelServer] Ollama inference failed: ${err.message}`);
    return null;
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let ollamaInfo = { running: false, models: [] };
  try {
    const ores = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1000) });
    if (ores.ok) {
      const odata = await ores.json();
      ollamaInfo = {
        running: true,
        models: (odata.models || []).map((m) => m.name || m.model),
        preferredModel: OLLAMA_PREFERRED_MODEL,
      };
    }
  } catch (_) {}

  res.json({
    status: 'ok',
    hasGeminiKey: !!aiClient,
    preferOllama: PREFER_OLLAMA,
    ollama: ollamaInfo,
    timestamp: new Date().toISOString(),
  });
});

// Speech-to-Text Transcription via Open-Source Whisper
app.post('/api/voice/transcribe', async (req, res) => {
  const { audio, mimeType } = req.body;

  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid audio data in request body.' });
  }

  // Determine file extension from explicit MIME type or data URI header
  let ext = '.webm';
  const detectedMime = (
    mimeType ||
    (audio.match(/^data:audio\/([a-zA-Z0-9_.-]+)/)?.[1]) ||
    ''
  ).toLowerCase();

  if (detectedMime.includes('mp4') || detectedMime.includes('m4a') || detectedMime.includes('aac')) {
    ext = '.mp4';
  } else if (detectedMime.includes('ogg')) {
    ext = '.ogg';
  } else if (detectedMime.includes('wav') || detectedMime.includes('x-wav')) {
    ext = '.wav';
  } else {
    ext = '.webm';
  }

  // Robust base64 stripping (handles complex codec params like codecs="opus,vorbis", ;base64,, and whitespace)
  let rawBase64 = audio;
  const base64Marker = ';base64,';
  const markerIdx = rawBase64.indexOf(base64Marker);
  if (markerIdx !== -1) {
    rawBase64 = rawBase64.slice(markerIdx + base64Marker.length);
  } else if (rawBase64.startsWith('data:')) {
    const commaIdx = rawBase64.lastIndexOf(',');
    if (commaIdx !== -1) {
      rawBase64 = rawBase64.slice(commaIdx + 1);
    }
  }
  const cleanBase64 = rawBase64.replace(/\s+/g, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  if (buffer.length < 64) {
    return res.status(400).json({
      error: 'Audio recording was empty. Please speak your command clearly.',
    });
  }

  const tempFilePath = path.join(os.tmpdir(), `sentinel_voice_${Date.now()}${ext}`);

  try {
    await fs.promises.writeFile(tempFilePath, buffer);

    const scriptPath = path.join(__dirname, 'transcribe.py');
    const pythonProc = spawn('python3', [scriptPath, tempFilePath]);

    let stdoutData = '';
    let stderrData = '';

    pythonProc.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProc.on('close', async (code) => {
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (err) {
        console.warn('[SentinelServer] Failed to clean temp voice file:', err.message);
      }

      // First check if stdout has a valid JSON error or result
      let parsed = null;
      try {
        if (stdoutData.trim()) {
          parsed = JSON.parse(stdoutData.trim());
        }
      } catch (parseErr) {
        // Not valid JSON
      }

      if (code !== 0 || (parsed && parsed.error)) {
        const errorMsg = (parsed && parsed.error) || stderrData.trim() || 'Whisper transcription failed';
        console.error(`[SentinelServer] Whisper transcription failed (code ${code}):`, errorMsg);
        return res.status(500).json({
          error: errorMsg,
          details: stderrData.trim(),
        });
      }

      if (parsed) {
        console.log(`[SentinelServer] Whisper Transcribed: "${parsed.text}" (lang: ${parsed.language})`);
        return res.json({
          success: true,
          text: parsed.text || '',
          language: parsed.language || 'en',
          model: 'openai-whisper-base',
        });
      }

      return res.status(500).json({
        error: 'Invalid Whisper output format',
        raw: stdoutData,
      });
    });
  } catch (err) {
    console.error('[SentinelServer] Error handling voice upload:', err);
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    } catch (_) {}
    return res.status(500).json({ error: err.message });
  }
});

// Interpreter schema for Gemini structured output
const intentSchema = {
  type: Type.OBJECT,
  properties: {
    goal: {
      type: Type.STRING,
      description: "Primary objective or intent extracted from the user's utterance (e.g. 'leave_home', 'make_cozy', 'prepare_sleep', 'inspect_safety', 'cook_mode', 'lock_perimeter', 'turn_off_unoccupied').",
    },
    scope: {
      type: Type.STRING,
      description: "Scope of affected areas or categories (e.g. 'all', 'kitchen', 'hall', 'exterior', 'doors', 'lights', 'comfort').",
    },
    speaker: {
      type: Type.STRING,
      description: "Identified or assumed speaker (e.g. 'You', 'Grandpa', 'Kid').",
    },
    urgency: {
      type: Type.STRING,
      enum: ['LOW', 'NORMAL', 'HIGH', 'EMERGENCY'],
      description: "Urgency level of the command.",
    },
    constraints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Constraints mentioned (e.g. 'keep kitchen on', 'do not wake grandpa', 'keep fridge safe').",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence rating from 0.0 to 1.0.",
    },
    ambiguities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Any ambiguities or missing details in the command that may require user clarification.",
    },
    rawUnderstanding: {
      type: Type.STRING,
      description: "Brief reasoning explaining how this intent was deduced from the prompt and world context.",
    }
  },
  required: ['goal', 'scope', 'urgency', 'constraints', 'confidence', 'ambiguities'],
};

// Interpretation endpoint with multi-tier fallback (Gemini -> Local Ollama -> Offline NLP)
app.post('/api/agent/interpret', async (req, res) => {
  const { prompt, worldSummary, speaker = 'You' } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  // 1. If PREFER_OLLAMA is configured, try local Ollama first
  if (PREFER_OLLAMA) {
    console.log('[SentinelServer] PREFER_OLLAMA active. Querying local Ollama first...');
    const ollamaResult = await queryOllamaIntent(prompt, worldSummary, speaker);
    if (ollamaResult && ollamaResult.intent) {
      return res.json({
        fallback: false,
        provider: 'ollama',
        model: ollamaResult.model,
        intent: ollamaResult.intent,
      });
    }
    console.warn('[SentinelServer] Preferred Ollama failed. Attempting Gemini fallback...');
  }

  // 2. Query Gemini API if configured
  if (aiClient) {
    try {
      const systemPrompt = `You are the Interpreter module for SentinelHome, an autonomous 3D smart-home safety agent.
Your goal is to parse user commands into a structured Intent object.
You output GOALS and CONSTRAINTS, NOT hardcoded device IDs or direct switch actions.
The downstream Planner will derive actions from the Device Capability Schema.

World Context:
${worldSummary ? JSON.stringify(worldSummary) : 'Standard 8-zone residence (Main Hall, Bedroom, Bathroom, Kitchen, Garage, Terrace, Lawn, Swimming Pool). Inhabitants: You (adult), Grandpa (vulnerable/elderly), Kid, Buddy (dog).'}

Current Speaker: ${speaker}

Remember:
- Handle typos, spoken phrasing, indirect requests ("it's freezing", "make it cozy", "I am stepping out", "Grandpa is resting", "filter the pool", "turn on filtering process switch").
- SWIMMING POOL SAFETY: If someone requests turning on the swimming pool filter while a swimmer or person is in the pool, record constraint "swimmer_in_pool_filtration_hazard" or goal "turn_on_devices" with scope "pool_filter". The downstream PolicyEngine will strictly enforce this invariant.
- If a command is contradictory or dangerous (e.g. "turn off everything including life-support or fridge", "turn on pool filter with swimmer inside"), mark high risk constraints or ambiguities.
- Never invent device-specific low-level commands. Derive the high-level intent.`;

      const candidateModels = Array.from(new Set([modelName, 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite']));
      let lastError = null;
      let parsedIntent = null;
      let usedModel = null;

      for (const m of candidateModels) {
        try {
          const response = await aiClient.models.generateContent({
            model: m,
            contents: [
              { role: 'user', parts: [{ text: `Command: "${prompt}"\nSpeaker: ${speaker}` }] },
            ],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: intentSchema,
              temperature: 0.2,
            },
          });

          parsedIntent = JSON.parse(response.text);
          if (parsedIntent) {
            usedModel = m;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[SentinelServer] Gemini model ${m} failed (${err.message}). Trying next candidate...`);
        }
      }

      if (parsedIntent) {
        return res.json({
          fallback: false,
          provider: 'gemini',
          model: usedModel,
          intent: parsedIntent,
        });
      }

      console.warn('[SentinelServer] All Gemini candidate models failed:', lastError?.message);
    } catch (error) {
      console.warn('[SentinelServer] Gemini error/quota reached:', error.message);
    }
  }

  // 3. Fallback to Local Ollama if Gemini failed, rate-limited, or unconfigured
  console.log('[SentinelServer] Gemini unavailable or rate-limited. Auto-switching to local Ollama...');
  const ollamaResult = await queryOllamaIntent(prompt, worldSummary, speaker);
  if (ollamaResult && ollamaResult.intent) {
    console.log(`[SentinelServer] Local Ollama successfully parsed intent using ${ollamaResult.model}`);
    return res.json({
      fallback: false,
      provider: 'ollama',
      model: ollamaResult.model,
      intent: ollamaResult.intent,
    });
  }

  // 4. Final safety net: High-capability client offline rule-based interpreter
  console.log('[SentinelServer] Both Gemini and Ollama unavailable. Falling back to built-in OfflineInterpreter.');
  return res.json({
    fallback: true,
    message: 'All LLM endpoints unavailable. Reverting to offline rule-based interpreter.',
  });
});

app.listen(port, () => {
  console.log(`[SentinelServer] Backend server running on http://localhost:${port}`);
});
