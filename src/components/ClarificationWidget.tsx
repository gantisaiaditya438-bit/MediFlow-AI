import React, { useState } from 'react';
import { HelpCircle, Send, CheckCircle2, MessageSquare, Sparkles, RefreshCw, Mic, MicOff } from 'lucide-react';
import { ClarificationQuestion } from '../types';

interface ClarificationWidgetProps {
  questions: ClarificationQuestion[];
  onRefineWithAnswers: (answeredQuestions: Array<{ question: string; answer: string; category: string }>) => Promise<void>;
  isRefining: boolean;
}

export const ClarificationWidget: React.FC<ClarificationWidgetProps> = ({
  questions,
  onRefineWithAnswers,
  isRefining,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeMicId, setActiveMicId] = useState<string | null>(null);

  const handleAnswerChange = (id: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [id]: text }));
  };

  const handleVoiceInput = (id: string) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (activeMicId === id) {
      setActiveMicId(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      setActiveMicId(id);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAnswers((prev) => ({
          ...prev,
          [id]: prev[id] ? `${prev[id]} ${transcript}` : transcript,
        }));
        setActiveMicId(null);
      };

      recognition.onerror = () => {
        setActiveMicId(null);
      };

      recognition.onend = () => {
        setActiveMicId(null);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech error:', e);
      setActiveMicId(null);
    }
  };

  const answeredCount = Object.values(answers).filter((a) => a && a.trim().length > 0).length;

  const handleSubmit = async () => {
    const payload = questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({
        question: q.question,
        category: q.category,
        answer: answers[q.id].trim(),
      }));

    if (payload.length === 0) return;
    await onRefineWithAnswers(payload);
  };

  if (!questions || questions.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Missing Clinical Context Clarifications
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {questions.length} Proactive Follow-ups
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Targeted questions to clarify duration, exact dosages, radiation, or rule out high-risk complications.
            </p>
          </div>
        </div>

        {answeredCount > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isRefining}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isRefining ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Refining HPI with Answers...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Update HPI ({answeredCount} Answered)</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {questions.map((q, idx) => {
          const hasAnswer = Boolean(answers[q.id]?.trim() || q.userAnswer);
          const isMicActive = activeMicId === q.id;

          return (
            <div
              key={q.id || idx}
              className={`p-3.5 rounded-xl border transition-all ${
                hasAnswer
                  ? 'bg-slate-950/80 border-teal-500/40'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400 mt-0.5">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                      {q.question}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      <span className="text-slate-500 font-medium">Clinical Rationale:</span> {q.rationale}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0 self-start">
                  {q.category}
                </span>
              </div>

              {/* Already recorded answer in previous refinement */}
              {q.userAnswer && (
                <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-teal-950/40 border border-teal-800/40 text-xs text-teal-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>
                    <strong>Incorporated Patient Response:</strong> {q.userAnswer}
                  </span>
                </div>
              )}

              {/* Inline Answer Input Box */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Type or dictate patient's response (e.g. 'Lasted 20 minutes', '5mg once daily', 'No radiation')..."
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleVoiceInput(q.id)}
                  title="Dictate response"
                  className={`p-2 rounded-lg border transition-colors ${
                    isMicActive
                      ? 'bg-rose-500 text-white animate-pulse border-rose-400'
                      : 'bg-slate-800 text-slate-300 hover:text-teal-300 border-slate-700'
                  }`}
                >
                  {isMicActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {answeredCount > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isRefining}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isRefining ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Refining HPI with Answers...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Update HPI ({answeredCount} Answered)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
