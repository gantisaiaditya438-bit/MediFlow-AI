import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Radio,
  FileText,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Activity,
  ArrowRight,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { ClinicalIntakeRecord } from '../types';
import { pcmFloat32ToBase64, LiveAudioPlayer } from '../utils/audioUtils';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface ClinicalChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecord: ClinicalIntakeRecord | null;
  onTransferToNarrative: (text: string) => void;
}

export const ClinicalChatbotDrawer: React.FC<ClinicalChatbotDrawerProps> = ({
  isOpen,
  onClose,
  currentRecord,
  onTransferToNarrative,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');
  const [textMessages, setTextMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Hello! I am your AI Clinical Intake & Triage Assistant. You can speak with me in real-time via Gemini 3.8 Live Voice, or type questions here to review history, check drug interactions, or elicit symptom details.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Gemini 3.8 Live Voice States
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Ready to start Live Voice session');
  const [liveTranscriptHistory, setLiveTranscriptHistory] = useState<
    { speaker: 'Patient/Staff' | 'Gemini Live'; text: string; time: string }[]
  >([]);
  const [currentAiSpeech, setCurrentAiSpeech] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<LiveAudioPlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const voiceTranscriptEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Audio Player
  useEffect(() => {
    audioPlayerRef.current = new LiveAudioPlayer();
    return () => {
      stopVoiceSession();
      audioPlayerRef.current?.close();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [textMessages]);

  useEffect(() => {
    voiceTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscriptHistory, currentAiSpeech]);

  // Start Gemini 3.8 Live Voice Session
  const startVoiceSession = async () => {
    try {
      setVoiceError(null);
      setVoiceStatus('Connecting to Gemini 3.8 Live API...');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsVoiceConnected(true);
        setVoiceStatus('Live WebSocket established. Requesting microphone...');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            setVoiceStatus('Live & Listening. Speak naturally...');
            setIsVoiceActive(true);
            startMicrophone(ws);
          } else if (data.type === 'audio' && data.audio) {
            if (!isMuted) {
              audioPlayerRef.current?.playChunk(data.audio);
            }
          } else if (data.type === 'model_transcript' && data.text) {
            setCurrentAiSpeech((prev) => {
              const updated = (prev + ' ' + data.text).trim();
              return updated;
            });
          } else if (data.type === 'user_transcript' && data.text) {
            setLiveTranscriptHistory((prev) => [
              ...prev,
              {
                speaker: 'Patient/Staff',
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          } else if (data.type === 'turn_complete') {
            setCurrentAiSpeech((latest) => {
              if (latest) {
                setLiveTranscriptHistory((prev) => [
                  ...prev,
                  {
                    speaker: 'Gemini Live',
                    text: latest,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }
              return '';
            });
          } else if (data.type === 'interrupted') {
            audioPlayerRef.current?.stopAndClear();
            setCurrentAiSpeech('');
          } else if (data.type === 'error') {
            setVoiceError(data.error || 'Live connection error occurred.');
            setVoiceStatus('Error in Live Session');
          }
        } catch (parseErr) {
          console.error('Error handling live message:', parseErr);
        }
      };

      ws.onerror = (err) => {
        console.error('Live WebSocket error:', err);
        setVoiceError('Could not establish Live WebSocket. Check network or server.');
        setVoiceStatus('Connection Failed');
        stopVoiceSession();
      };

      ws.onclose = () => {
        setIsVoiceConnected(false);
        setIsVoiceActive(false);
        setVoiceStatus('Session ended');
      };
    } catch (err: any) {
      setVoiceError(err.message || 'Failed to start Live session');
      setVoiceStatus('Failed');
    }
  };

  // Capture user microphone at 16kHz PCM
  const startMicrophone = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      // Buffer size 4096 samples at 16kHz is ~250ms chunks
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      scriptProcessor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const base64Audio = pcmFloat32ToBase64(inputData);
        ws.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
      };
    } catch (micErr: any) {
      console.error('Microphone access denied or error:', micErr);
      setVoiceError('Microphone permission required for Live voice intake: ' + micErr.message);
      setVoiceStatus('Microphone Access Denied');
    }
  };

  const stopVoiceSession = () => {
    // Flush current AI speech into history if pending
    if (currentAiSpeech) {
      setLiveTranscriptHistory((prev) => [
        ...prev,
        {
          speaker: 'Gemini Live',
          text: currentAiSpeech,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setCurrentAiSpeech('');
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    audioPlayerRef.current?.stopAndClear();
    setIsVoiceConnected(false);
    setIsVoiceActive(false);
    setVoiceStatus('Session ended');
  };

  // Send Text Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isSending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTextMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...textMessages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentRecord,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get clinical response.');
      }

      const data = await response.json();
      const modelMsg: Message = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.reply || 'Acknowledged. What other symptoms or history should be elicited?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setTextMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setTextMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: 'Error: ' + (err.message || 'Could not connect to clinical chat.'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTransferAllVoiceToNarrative = () => {
    if (liveTranscriptHistory.length === 0) return;
    const combined = liveTranscriptHistory
      .map((item) => `${item.speaker}: ${item.text}`)
      .join('\n');
    onTransferToNarrative(combined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              OPD Clinical Chatbot & Live Voice
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Gemini 3.8
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentRecord
                ? `Active Patient: ${currentRecord.patientMeta?.nameOrId || 'Intake'}`
                : 'General OPD Clinical Intake Mode'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-2 bg-slate-950 border-b border-slate-800 gap-1.5">
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'voice'
              ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isVoiceActive ? 'animate-pulse text-rose-300' : ''}`} />
          <span>Gemini 3.8 Live Voice</span>
          {isVoiceActive && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'text'
              ? 'bg-slate-800 text-teal-300 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Clinical Text Chat</span>
        </button>
      </div>

      {/* TAB 1: GEMINI 3.8 LIVE VOICE CONVERSATION */}
      {activeTab === 'voice' && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-4">
          {/* Voice Status & Controls */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
            {/* Animated Waveform Background when active */}
            {isVoiceActive && (
              <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center gap-1">
                <div className="w-1.5 h-8 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-12 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-16 bg-teal-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-10 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <div className="w-1.5 h-6 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.4s]" />
              </div>
            )}

            {/* Mic Toggle Button */}
            <button
              onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isVoiceActive
                  ? 'bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-gradient-to-tr from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 ring-4 ring-teal-500/20'
              }`}
            >
              {isVoiceActive ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <div className="relative z-10">
              <span
                className={`text-xs font-bold uppercase tracking-wider block ${
                  isVoiceActive ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {voiceStatus}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isVoiceActive
                  ? 'Low-latency 16kHz in / 24kHz out speech conversation active'
                  : 'Click microphone to initiate live audio intake with gemini-3.8-live'}
              </p>
            </div>

            {/* Audio output mute button */}
            {isVoiceActive && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="relative z-10 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-1.5"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
                <span>{isMuted ? 'Unmute Audio Out' : 'Mute Audio Out'}</span>
              </button>
            )}

            {voiceError && (
              <div className="p-2 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{voiceError}</span>
              </div>
            )}
          </div>

          {/* Rolling Transcript Feed */}
          <div className="flex-1 flex flex-col bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850 mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                Live Conversation Transcript
              </span>

              {liveTranscriptHistory.length > 0 && (
                <button
                  onClick={handleTransferAllVoiceToNarrative}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 flex items-center gap-1 transition-colors"
                  title="Populates the main narrative input form with this spoken transcript"
                >
                  <FileText className="w-3 h-3" />
                  <span>Transfer to Intake Form</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {liveTranscriptHistory.length === 0 && !currentAiSpeech && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-1 py-8">
                  <Mic className="w-8 h-8 opacity-30 text-slate-400" />
                  <p className="text-xs font-medium">No live speech recorded yet</p>
                  <p className="text-[11px] max-w-xs">
                    Start the session to speak with the assistant. The transcript will automatically populate here.
                  </p>
                </div>
              )}

              {liveTranscriptHistory.map((item, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                    item.speaker === 'Patient/Staff'
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 ml-4'
                      : 'bg-teal-950/30 border border-teal-800/40 text-teal-100 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold uppercase tracking-wider">{item.speaker}</span>
                    <span>{item.time}</span>
                  </div>
                  <p>{item.text}</p>
                </div>
              ))}

              {/* Streaming speech currently in progress */}
              {currentAiSpeech && (
                <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/40 text-teal-200 mr-4 animate-pulse">
                  <div className="flex items-center justify-between text-[10px] text-teal-400 mb-1">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Gemini Live (Speaking...)
                    </span>
                  </div>
                  <p>{currentAiSpeech}</p>
                </div>
              )}

              <div ref={voiceTranscriptEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLINICAL TEXT CHAT */}
      {activeTab === 'text' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick Doctor Prompts */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-300">
            <span className="text-slate-500 font-semibold shrink-0">Quick Prompts:</span>
            <button
              onClick={() => {
                setInputMessage('Summarize the top red flag concerns for this patient.');
              }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 shrink-0 text-slate-300 hover:text-white"
            >
              Red Flags Check
            </button>
            <button
              onClick={() => {
                setInputMessage('What high-yield pertinent negatives should we document for this HPI?');
              }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 shrink-0 text-slate-300 hover:text-white"
            >
              Pertinent Negatives
            </button>
            <button
              onClick={() => {
                setInputMessage('Explain the medication reconciliation risks and drug-drug interactions.');
              }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 shrink-0 text-slate-300 hover:text-white"
            >
              Med Interaction Analysis
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {textMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>

                    {msg.role === 'model' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="hover:text-slate-200 flex items-center gap-0.5"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => {
                            onTransferToNarrative(msg.content);
                            onClose();
                          }}
                          className="hover:text-teal-300 flex items-center gap-0.5"
                          title="Transfer into Intake Narrative"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Use in Intake</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic p-2 bg-slate-950/60 rounded-xl w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-teal-400" />
                <span>Clinical assistant analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask clinical question, request differentials, or query medications..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={isSending || !inputMessage.trim()}
              className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-xl transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
