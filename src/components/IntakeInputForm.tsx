import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, User, FileText, RefreshCw, AlertCircle, Shield, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { CLINICAL_PRESETS } from '../presets';
import { IntakePresetScenario } from '../types';

export const INTAKE_DRAFT_STORAGE_KEY = 'opd_clinical_intake_draft_v1';

export interface IntakeDraftData {
  narrative: string;
  name: string;
  age: string;
  gender: string;
  lastSaved: number;
}

interface IntakeInputFormProps {
  onSubmit: (narrative: string, meta: { name: string; age: string; gender: string }) => void;
  isLoading: boolean;
  onSelectPreset: (preset: IntakePresetScenario) => void;
  initialNarrative?: string;
  initialMeta?: { name: string; age: string; gender: string };
  onDraftCleared?: () => void;
}

export const IntakeInputForm: React.FC<IntakeInputFormProps> = ({
  onSubmit,
  isLoading,
  onSelectPreset,
  initialNarrative = '',
  initialMeta = { name: '', age: '', gender: '' },
  onDraftCleared,
}) => {
  const [narrative, setNarrative] = useState(initialNarrative);
  const [name, setName] = useState(initialMeta.name);
  const [age, setAge] = useState(initialMeta.age);
  const [gender, setGender] = useState(initialMeta.gender);

  // Draft auto-save state
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isInitialMountRef = useRef(true);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechStatus, setSpeechStatus] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // On mount: Check for existing draft in sessionStorage
  useEffect(() => {
    try {
      const savedDraftRaw = sessionStorage.getItem(INTAKE_DRAFT_STORAGE_KEY);
      if (savedDraftRaw) {
        const savedDraft: IntakeDraftData = JSON.parse(savedDraftRaw);
        const hasContent =
          (savedDraft.narrative && savedDraft.narrative.trim().length > 0) ||
          (savedDraft.name && savedDraft.name.trim().length > 0) ||
          (savedDraft.age && savedDraft.age.trim().length > 0) ||
          (savedDraft.gender && savedDraft.gender.trim().length > 0);

        if (hasContent) {
          // If the form doesn't already have external initial values loaded
          if (!initialNarrative && !initialMeta.name) {
            setNarrative(savedDraft.narrative || '');
            setName(savedDraft.name || '');
            setAge(savedDraft.age || '');
            setGender(savedDraft.gender || '');
            setLastSavedTimestamp(savedDraft.lastSaved);
            setIsDraftRestored(true);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to recover intake draft from sessionStorage:', e);
    }
  }, []);

  // Update from external props if parent provides changes (e.g. preset selection or new encounter reset)
  useEffect(() => {
    if (initialNarrative !== undefined) {
      setNarrative(initialNarrative);
    }
  }, [initialNarrative]);

  useEffect(() => {
    if (initialMeta.name !== undefined) setName(initialMeta.name);
    if (initialMeta.age !== undefined) setAge(initialMeta.age);
    if (initialMeta.gender !== undefined) setGender(initialMeta.gender);
  }, [initialMeta]);

  // Draft auto-save effect with debounce
  useEffect(() => {
    // Avoid saving on empty initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const hasAnyValue =
      narrative.trim().length > 0 ||
      name.trim().length > 0 ||
      age.trim().length > 0 ||
      gender.trim().length > 0;

    if (!hasAnyValue) {
      try {
        sessionStorage.removeItem(INTAKE_DRAFT_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to clear sessionStorage draft:', e);
      }
      setLastSavedTimestamp(null);
      setAutoSaveStatus('idle');
      return;
    }

    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const now = Date.now();
        const draftData: IntakeDraftData = {
          narrative,
          name,
          age,
          gender,
          lastSaved: now,
        };
        sessionStorage.setItem(INTAKE_DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setLastSavedTimestamp(now);
        setAutoSaveStatus('saved');
      } catch (e) {
        console.warn('Failed to auto-save intake draft to sessionStorage:', e);
        setAutoSaveStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [narrative, name, age, gender]);

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechStatus('Listening to patient narrative...');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          setNarrative((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechStatus('Microphone permission denied.');
        } else {
          setSpeechStatus(`Speech error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setSpeechStatus('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition init failed:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setSpeechStatus('');
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  const handlePresetClick = (preset: IntakePresetScenario) => {
    setNarrative(preset.transcript);
    // Auto-fill metadata if detected
    if (preset.id === 'acs-chest-pain') {
      setName('Ramesh Kumar (OPD-1029)');
      setAge('58');
      setGender('Male');
    } else if (preset.id === 'stroke-triage') {
      setName('Eleanor Davis (OPD-1030)');
      setAge('66');
      setGender('Female');
    } else if (preset.id === 'dyspepsia-nsaid') {
      setName('David Miller (OPD-1031)');
      setAge('38');
      setGender('Male');
    } else if (preset.id === 'vernacular-hinglish') {
      setName('Sunita Devi (OPD-1032)');
      setAge('54');
      setGender('Female');
    } else if (preset.id === 'respiratory-tb') {
      setName('Kishan Lal (OPD-1033)');
      setAge('52');
      setGender('Male');
    }
    onSelectPreset(preset);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) return;
    onSubmit(narrative.trim(), { name: name.trim(), age: age.trim(), gender: gender.trim() });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              Unstructured Patient Intake Transcript
            </h2>

            {/* Auto-save status badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-[10px] font-mono">
              {autoSaveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-300">Auto-saving draft...</span>
                </>
              ) : lastSavedTimestamp ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-400">
                    Draft auto-saved {new Date(lastSavedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500">Draft auto-save active (sessionStorage)</span>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Enter or dictate free-form patient narrative, vernacular complaints, or ambulance handover notes.
          </p>
        </div>

        {/* Live Audio / Dictation Button */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/25 ring-2 ring-rose-400/50'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-teal-400" />}
            <span>{isRecording ? 'Stop Dictation' : 'Voice Dictate'}</span>
          </button>
        )}
      </div>

      {/* Recovered Draft Notice if restored on reload */}
      {isDraftRestored && (
        <div className="mt-3 p-3 rounded-xl bg-teal-950/40 border border-teal-800/60 text-xs text-teal-200 flex items-center justify-between gap-3 animate-fade-in shadow-inner">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              <strong>Draft Recovered:</strong> Unsaved intake content from your previous browser session has been automatically restored.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsDraftRestored(false)}
            className="text-teal-400 hover:text-teal-100 font-bold px-2 py-0.5 rounded text-[11px] hover:bg-teal-900/40 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {speechStatus && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-teal-950/60 border border-teal-800/50 text-xs text-teal-300 flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>{speechStatus}</span>
        </div>
      )}

      {/* Preset Scenarios Carousel */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Quick OPD Triage Scenarios:
          </span>
          <span className="text-[10px] text-slate-500">Click to auto-populate test cases</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {CLINICAL_PRESETS.map((preset) => {
            const isRed = preset.badge === 'Red Flag';
            const isUrgent = preset.badge === 'Urgent';
            const isMulti = preset.badge === 'Multilingual';
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/40 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isRed
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isUrgent
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isMulti
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 line-clamp-1">
                    {preset.title}
                  </h4>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">
                  {preset.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Basic Registration Meta Fields */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Patient Name / Reg # (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar (OPD-1029)"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Reported Age
            </label>
            <input
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 58"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Reported Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            >
              <option value="">Select / Unspecified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other / Non-binary</option>
            </select>
          </div>
        </div>

        {/* Narrative Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Raw Patient Narrative / Verbal Transcript
            </label>
            <span className="text-[11px] text-slate-500">
              {narrative.length} characters &bull; {narrative.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={5}
            placeholder="Type or dictate the patient's unfiltered words. Include symptom description, duration, home remedies, medications, allergies, vernacular words, or family history. Notice that government IDs like Aadhaar or SSN are automatically sanitized."
            className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-mono leading-relaxed"
          />
        </div>

        {/* Bottom Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Strict intake role-boundary: Data structuring only. No direct diagnosis issued.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(narrative || name || age || gender) && (
              <button
                type="button"
                onClick={() => {
                  setNarrative('');
                  setName('');
                  setAge('');
                  setGender('');
                  setIsDraftRestored(false);
                  setLastSavedTimestamp(null);
                  setAutoSaveStatus('idle');
                  try {
                    sessionStorage.removeItem(INTAKE_DRAFT_STORAGE_KEY);
                  } catch (e) {
                    console.warn('Failed to clear sessionStorage draft:', e);
                  }
                  if (onDraftCleared) onDraftCleared();
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Clear current inputs and remove saved draft"
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !narrative.trim()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Structuring Clinical Summary...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Analyze & Structure Clinical Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
