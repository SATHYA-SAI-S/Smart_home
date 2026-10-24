import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Loader2,
  Radio
} from 'lucide-react';
import { useAgentStore } from '../../../store/useAgentStore';
import { useWorldStore } from '../../../store/useWorldStore';
import { AgentOrchestrator } from '../../../agent/AgentOrchestrator';
import { AutonomyLevel } from '../../../types/agent';

export const ChatTab: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [collapsedStages, setCollapsedStages] = useState<{ [msgId: string]: boolean }>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const hasSpokenRef = useRef<boolean>(false);

  const messages = useAgentStore((state) => state.messages);
  const currentSpeaker = useAgentStore((state) => state.currentSpeaker);
  const setSpeaker = useAgentStore((state) => state.setSpeaker);
  const autonomyLevel = useAgentStore((state) => state.autonomyLevel);
  const setAutonomyLevel = useAgentStore((state) => state.setAutonomyLevel);
  const setActiveTab = useAgentStore((state) => state.setActiveTab);
  const people = useWorldStore((state) => state.people);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
    };
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;
    setInputText('');
    await AgentOrchestrator.runPipeline(text, currentSpeaker);
  };

  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    setAudioVolume(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      setIsListening(false);
      return;
    }

    setIsListening(false);
    setIsTranscribing(true);
    setVoiceStatus('Transcribing speech with Whisper AI...');

    const mediaRecorder = mediaRecorderRef.current;

    // Flush any pending data in media recorder
    try {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.requestData();
      }
    } catch (_) {}

    mediaRecorder.onstop = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        // If blob is totally empty and no speech was heard
        if (audioBlob.size === 0 && !interimTranscriptRef.current) {
          setIsTranscribing(false);
          setVoiceStatus('No audio recorded. Click mic and speak clearly.');
          setTimeout(() => setVoiceStatus(null), 3000);
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;

          try {
            const res = await fetch('/api/voice/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: base64Data,
                mimeType: audioBlob.type || mediaRecorder.mimeType,
              }),
            });

            const data = await res.json();
            setIsTranscribing(false);

            if (res.ok && data.text && data.text.trim().length > 0) {
              const transcribedText = data.text.trim();
              setInputText(transcribedText);
              setVoiceStatus(`Transcribed: "${transcribedText}"`);
              setTimeout(() => setVoiceStatus(null), 3500);
              // Forward transcribed speech directly into Gemini pipeline
              await handleSend(transcribedText);
            } else if (interimTranscriptRef.current) {
              // Resilient fallback to real-time speech recognizer
              const fallbackText = interimTranscriptRef.current;
              console.log('Using real-time speech fallback:', fallbackText);
              setInputText(fallbackText);
              setVoiceStatus(`Heard: "${fallbackText}"`);
              setTimeout(() => setVoiceStatus(null), 3500);
              await handleSend(fallbackText);
            } else {
              setVoiceStatus(data.error || 'No speech detected. Please speak clearly.');
              setTimeout(() => setVoiceStatus(null), 3500);
            }
          } catch (fetchErr: any) {
            console.error('Transcription request failed:', fetchErr);
            setIsTranscribing(false);
            if (interimTranscriptRef.current) {
              const fallbackText = interimTranscriptRef.current;
              setInputText(fallbackText);
              setVoiceStatus(`Heard: "${fallbackText}"`);
              setTimeout(() => setVoiceStatus(null), 3500);
              await handleSend(fallbackText);
            } else {
              setVoiceStatus('Whisper server error. Please try again.');
              setTimeout(() => setVoiceStatus(null), 3500);
            }
          }
        };
      } catch (procErr: any) {
        console.error('Error processing audio recording:', procErr);
        setIsTranscribing(false);
        setVoiceStatus('Audio processing failed');
        setTimeout(() => setVoiceStatus(null), 3000);
      }
    };

    try {
      mediaRecorder.stop();
    } catch (_) {}
  };

  const startRecording = async () => {
    try {
      setVoiceStatus('Accessing microphone...');
      interimTranscriptRef.current = '';
      hasSpokenRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const candidateMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav',
      ];
      const mimeType = candidateMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Listening... Speak now (auto-stops on silence)');
      };

      // Audio volume metering & Voice Activity Detection (VAD)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const vol = Math.min(100, Math.round((avg / 128) * 100));
            setAudioVolume(vol);

            // Voice Activity Detection (auto-stop 1.3s after speech ends)
            if (vol > 15) {
              hasSpokenRef.current = true;
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            } else if (hasSpokenRef.current) {
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                  stopRecording();
                }, 1300);
              }
            }

            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      } catch (audioErr) {
        console.warn('AudioContext metering setup skipped:', audioErr);
      }

      // Real-time interim preview via Web Speech API if supported in browser
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.onresult = (e: any) => {
            const transcript = Array.from(e.results)
              .map((r: any) => r[0].transcript)
              .join('');
            if (transcript) {
              interimTranscriptRef.current = transcript.trim();
              setInputText(transcript);
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        } catch (_) {}
      }

      mediaRecorder.start(200);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setIsListening(false);
      setVoiceStatus('Microphone permission denied or unavailable');
      setTimeout(() => setVoiceStatus(null), 3500);
    }
  };

  const toggleRecording = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleStages = (msgId: string) => {
    setCollapsedStages((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Quick scenario presets
  const presets = [
    { label: "I'm leaving home", prompt: "I'm leaving home, make sure everything is safe." },
    { label: "Goodnight", prompt: "Goodnight, lock the doors and turn off living room appliances." },
    { label: "Make it cozy", prompt: "Make it cozy in the hall for movie night." },
    { label: "I'm cooking", prompt: "I'm cooking dinner, keep the kitchen lights and stove ready." },
    { label: "Grandpa's power", prompt: "Turn off what Grandpa isn't using right now." },
    { label: "Filter pool", prompt: "Turn on the pool filter." },
    { label: "Check home safety", prompt: "Is everything safe in the house right now?" },
    { label: "Lock all doors", prompt: "Lock all doors and perimeter gates." },
  ];

  return (
    <div className="flex flex-col h-full justify-between">
      {/* CONTROLS HEADER (Speaker & Autonomy Level) */}
      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 mb-3 flex items-center justify-between space-x-2 text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 font-medium">Speaking as:</span>
          <select
            value={currentSpeaker}
            onChange={(e) => setSpeaker(e.target.value)}
            className="bg-slate-800 text-sky-400 font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {people.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} ({p.attributes.ageGroup})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 font-medium">Autonomy:</span>
          <select
            value={autonomyLevel}
            onChange={(e) => setAutonomyLevel(e.target.value as AutonomyLevel)}
            className="bg-slate-800 text-indigo-300 font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ask_always">Ask Always</option>
            <option value="ask_on_risk">Ask on Risk</option>
            <option value="auto_safe">Auto Safe</option>
          </select>
        </div>
      </div>

      {/* QUICK SCENARIO CHIPS */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {presets.map((preset, idx) => (
          <button
            key={`preset_${idx}`}
            onClick={() => handleSend(preset.prompt)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/5 hover:border-sky-500/30 text-[11px] font-medium transition flex items-center space-x-1"
          >
            <Sparkles size={11} className="text-sky-400" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* MESSAGE STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isCollapsed = collapsedStages[msg.id];

          return (
            <div
              key={msg.id}
              className={`p-3 rounded-2xl text-xs ${
                isUser
                  ? 'bg-sky-600/20 border border-sky-500/30 ml-8 text-sky-100'
                  : 'bg-slate-900/70 border border-white/10 mr-4 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span className="font-bold text-sky-300">
                  {isUser ? msg.speaker || 'User' : 'SentinelHome Agent'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="text-slate-100 text-xs mb-2 leading-relaxed">{msg.text}</div>

              {/* 6-STAGE REASONING STEPPER */}
              {msg.stageStatuses && msg.stageStatuses.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div
                    onClick={() => toggleStages(msg.id)}
                    className="flex items-center justify-between text-[11px] font-semibold text-slate-300 cursor-pointer hover:text-white mb-2"
                  >
                    <span className="flex items-center space-x-1">
                      <Zap size={12} className="text-sky-400" />
                      <span>Reasoning & Verification Stepper</span>
                    </span>
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-1.5 pl-1">
                      {msg.stageStatuses.map((st, i) => {
                        let statusIcon = <Clock size={12} className="text-slate-500" />;
                        let badgeClass = 'text-slate-400 bg-slate-800/60';

                        if (st.status === 'running') {
                          statusIcon = <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />;
                          badgeClass = 'text-sky-300 bg-sky-500/20 border border-sky-500/30';
                        } else if (st.status === 'done') {
                          statusIcon = <CheckCircle2 size={13} className="text-emerald-400" />;
                          badgeClass = 'text-emerald-300 bg-emerald-500/20';
                        } else if (st.status === 'blocked') {
                          statusIcon = <ShieldAlert size={13} className="text-rose-400" />;
                          badgeClass = 'text-rose-300 bg-rose-500/20 font-bold';
                        } else if (st.status === 'error') {
                          statusIcon = <AlertTriangle size={13} className="text-amber-400" />;
                          badgeClass = 'text-amber-300 bg-amber-500/20';
                        }

                        return (
                          <div
                            key={`stage_${msg.id}_${i}`}
                            className={`p-2 rounded-xl text-[11px] flex items-start space-x-2 border border-white/5 ${badgeClass}`}
                          >
                            <div className="mt-0.5">{statusIcon}</div>
                            <div className="flex-1">
                              <div className="font-semibold">{st.label}</div>
                              {st.detail && (
                                <div className="text-[10px] text-slate-300 mt-0.5 opacity-90">
                                  {st.detail}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* PROMPT TO VIEW PLAN IN TAB 2 IF BLOCKED FOR APPROVAL */}
                  {msg.stageStatuses.some((s) => s.status === 'blocked') && (
                    <div className="mt-3">
                      <button
                        onClick={() => setActiveTab('plan')}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition flex items-center justify-center space-x-1.5"
                      >
                        <span>Review Plan & Grant Approval in Tab 2</span>
                        <ChevronDown size={14} className="-rotate-90" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* VOICE STATUS BANNER */}
      {(voiceStatus || isListening) && (
        <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center justify-between border transition ${
          isListening
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : isTranscribing
            ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            : 'bg-slate-800/80 border-white/10 text-slate-300'
        }`}>
          <div className="flex items-center space-x-2 truncate">
            {isListening && (
              <div className="flex items-center space-x-1 shrink-0">
                <Radio size={14} className="animate-pulse text-rose-400" />
                {/* Live audio volume wave meter */}
                <div className="flex items-end space-x-0.5 h-3 px-1">
                  <div
                    className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(3, Math.min(12, Math.round(audioVolume * 0.15)))}px` }}
                  />
                  <div
                    className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(4, Math.min(14, Math.round(audioVolume * 0.25)))}px` }}
                  />
                  <div
                    className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(3, Math.min(12, Math.round(audioVolume * 0.2)))}px` }}
                  />
                  <div
                    className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(2, Math.min(10, Math.round(audioVolume * 0.1)))}px` }}
                  />
                </div>
              </div>
            )}
            {isTranscribing && <Loader2 size={14} className="animate-spin text-sky-400 shrink-0" />}
            <span className="truncate">{voiceStatus || 'Listening to microphone...'}</span>
          </div>

          {isListening && (
            <button
              type="button"
              onClick={stopRecording}
              className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition shrink-0"
            >
              Done / Stop
            </button>
          )}
        </div>
      )}

      {/* INPUT COMMAND BAR */}
      <div className="pt-2 border-t border-white/10 mt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Listening to your voice (speak now)..." : isTranscribing ? "Transcribing speech with Whisper AI..." : "Give a command or click mic to speak..."}
              className={`w-full bg-slate-900/90 text-xs text-white placeholder-slate-400 rounded-xl px-3.5 py-2.5 border transition pr-10 ${
                isListening ? 'border-rose-500/60 ring-1 ring-rose-500/40' : 'border-white/15 focus:outline-none focus:border-sky-400'
              }`}
            />
            {/* Mic / Whisper Voice Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing}
              className={`absolute right-2 top-2 p-1.5 rounded-lg transition ${
                isTranscribing
                  ? 'text-sky-400 cursor-wait'
                  : isListening
                  ? 'text-rose-400 bg-rose-500/20 animate-pulse ring-1 ring-rose-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isListening ? "Click to stop & transcribe with Whisper" : "Click to speak via Whisper AI voice input"}
            >
              {isTranscribing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Mic size={15} />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isListening || isTranscribing}
            className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white transition shadow-md shadow-sky-500/30 flex items-center justify-center shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
