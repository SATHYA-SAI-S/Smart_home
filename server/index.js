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

if (apiKey && apiKey.length > 5) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log(`[SentinelServer] Gemini client initialized with model: ${modelName}`);
  } catch (err) {
    console.warn('[SentinelServer] Failed to initialize GoogleGenAI:', err.message);
  }
} else {
  console.log('[SentinelServer] No GEMINI_API_KEY found in environment. System will utilize built-in Offline Fallback Interpreter.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!aiClient,
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

// Interpretation endpoint
app.post('/api/agent/interpret', async (req, res) => {
  const { prompt, worldSummary, speaker = 'You' } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  // If Gemini API is not configured or fails, client or fallback can handle it
  if (!aiClient) {
    return res.json({
      fallback: true,
      message: 'Gemini API key not configured on server. Use offline rule-based interpreter.',
    });
  }

  try {
    const systemPrompt = `You are the Interpreter module for SentinelHome, an autonomous 3D smart-home safety agent.
Your goal is to parse user commands into a structured Intent object.
You output GOALS and CONSTRAINTS, NOT hardcoded device IDs or direct switch actions.
The downstream Planner will derive actions from the Device Capability Schema.

World Context:
${worldSummary ? JSON.stringify(worldSummary) : 'Standard 8-zone residence (Main Hall, Bedroom, Bathroom, Kitchen, Garage, Terrace, Lawn, Swimming Pool). Inhabitants: You (adult), Grandpa (vulnerable/elderly), Kid, Sudharshini, Buddy (dog).'}

Current Speaker: ${speaker}

Remember:
- Handle typos, spoken phrasing, indirect requests ("it's freezing", "make it cozy", "I am stepping out", "Grandpa is resting", "filter the pool", "turn on filtering process switch").
- SWIMMING POOL SAFETY: If someone requests turning on the swimming pool filter while a swimmer or person is in the pool, record constraint "swimmer_in_pool_filtration_hazard" or goal "turn_on_devices" with scope "pool_filter". The downstream PolicyEngine will strictly enforce this invariant.
- If a command is contradictory or dangerous (e.g. "turn off everything including life-support or fridge", "turn on pool filter with swimmer inside"), mark high risk constraints or ambiguities.
- Never invent device-specific low-level commands. Derive the high-level intent.`;

    const candidateModels = Array.from(new Set([modelName, 'gemini-2.5-flash-lite', 'gemini-1.5-flash']));
    let lastError = null;
    let parsedIntent = null;

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
        if (parsedIntent) break;
      } catch (err) {
        lastError = err;
        console.warn(`[SentinelServer] Model ${m} failed (${err.message}). Trying next candidate...`);
      }
    }

    if (parsedIntent) {
      return res.json({
        fallback: false,
        intent: parsedIntent,
      });
    }

    throw lastError || new Error('All candidate models failed');
  } catch (error) {
    console.error('[SentinelServer] Gemini interpretation error:', error);
    return res.json({
      fallback: true,
      error: error.message,
      message: 'Failed to query Gemini. Reverting to offline rule-based interpreter.',
    });
  }
});

app.listen(port, () => {
  console.log(`[SentinelServer] Backend server running on http://localhost:${port}`);
});
