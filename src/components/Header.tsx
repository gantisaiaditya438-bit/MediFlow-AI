import React from 'react';
import { ShieldCheck, Stethoscope, Activity, FileSpreadsheet, Lock, Film, History, BarChart3 } from 'lucide-react';
import { TriageLevel } from '../types';

interface HeaderProps {
  currentTriage?: TriageLevel;
  patientCount: number;
  onOpenQueue: () => void;
  onNewEncounter: () => void;
  isQueueOpen: boolean;
  onToggleChatbot: () => void;
  isChatbotOpen: boolean;
  onOpenVideoGenerator: () => void;
  onOpenHistory: () => void;
  isHistoryOpen?: boolean;
  onToggleDashboard: () => void;
  isDashboardOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTriage,
  patientCount,
  onOpenQueue,
  onNewEncounter,
  isQueueOpen,
  onToggleChatbot,
  isChatbotOpen,
  onOpenVideoGenerator,
  onOpenHistory,
  isHistoryOpen = false,
  onToggleDashboard,
  isDashboardOpen = false,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & OPD Clinic Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-slate-950 font-bold">
            <Stethoscope className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                OPD Clinical Intake
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  AI Triage Engine
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Physician-ready history structuring &bull; SOCRATES HPI &bull; Red-Flag Triage
            </p>
          </div>
        </div>

        {/* Center / Privacy Shield Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="font-medium text-emerald-400">Strict PII Redaction:</span>
            <span>Aadhaar / SSN / National IDs masked as <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 text-[11px]">[ID Redacted]</code></span>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenVideoGenerator}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-all flex items-center gap-1.5 shadow-sm"
            title="Animate images into video using Veo (veo-3.1-fast-generate-preview)"
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold">Animate to Video</span>
            <span className="text-[10px] font-mono font-bold px-1 rounded bg-rose-500/20 text-rose-200">Veo</span>
          </button>

          <button
            onClick={onToggleChatbot}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              isChatbotOpen
                ? 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 text-teal-300 border-teal-500/50 shadow-sm'
                : 'bg-slate-800 text-teal-300 border-slate-700 hover:bg-slate-750'
            }`}
            title="Open Gemini 3.8 Live Voice & Clinical Chatbot"
          >
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="font-semibold">Live Voice & Chat</span>
          </button>

          <button
            onClick={onToggleDashboard}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isDashboardOpen
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="View Clinic Daily Throughput & Triage Analytics Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">Dashboard</span>
          </button>

          <button
            onClick={onOpenHistory}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isHistoryOpen
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="View Encounter History & Re-print Slips"
          >
            <History className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-semibold">History</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono">
              {patientCount}
            </span>
          </button>

          <button
            onClick={onOpenQueue}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isQueueOpen
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="View OPD Patient Queue"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>OPD Queue</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono">
              {patientCount}
            </span>
          </button>

          <button
            onClick={onNewEncounter}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>+ New Patient</span>
          </button>
        </div>
      </div>
    </header>
  );
};
