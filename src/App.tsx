/**
 * AI Clinical History Intake Assistant
 * High-Throughput OPD Triage & Clinical Summary Engine
 */
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { IntakeInputForm, INTAKE_DRAFT_STORAGE_KEY } from './components/IntakeInputForm';
import { TriageBanner } from './components/TriageBanner';
import { SocratesCard } from './components/SocratesCard';
import { ClarificationWidget } from './components/ClarificationWidget';
import { MedicationReconciliationCard } from './components/MedicationReconciliationCard';
import { ClinicalEntitiesView } from './components/ClinicalEntitiesView';
import { PhysicianSoapView } from './components/PhysicianSoapView';
import { PrintableSlip } from './components/PrintableSlip';
import { QueueDrawer } from './components/QueueDrawer';
import { EncounterHistoryDrawer } from './components/EncounterHistoryDrawer';
import { DailyThroughputDashboard } from './components/DailyThroughputDashboard';
import { ClinicalChatbotDrawer } from './components/ClinicalChatbotDrawer';
import { ImageToVideoGenerator } from './components/ImageToVideoGenerator';
import { CLINICAL_PRESETS } from './presets';
import { ClinicalIntakeRecord, IntakePresetScenario, MedicationReconciliationReport } from './types';
import {
  AlertTriangle,
  Stethoscope,
  Activity,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Bot,
  Radio,
  Film,
  History,
} from 'lucide-react';

const STORAGE_KEY = 'opd_clinical_intake_queue_v1';

export default function App() {
  const [queue, setQueue] = useState<ClinicalIntakeRecord[]>([]);
  const [currentRecord, setCurrentRecord] = useState<ClinicalIntakeRecord | null>(null);
  const [recordToPrint, setRecordToPrint] = useState<ClinicalIntakeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isVideoGenOpen, setIsVideoGenOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [activeNarrative, setActiveNarrative] = useState('');
  const [activeMeta, setActiveMeta] = useState({ name: '', age: '', gender: '' });

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQueue(parsed);
          setCurrentRecord(parsed[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load queue from storage:', e);
    }
  }, []);

  // Sync queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to save queue to storage:', e);
    }
  }, [queue]);

  // Clean up re-print record after browser print dialog finishes
  useEffect(() => {
    const handleAfterPrint = () => {
      setRecordToPrint(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleProcessIntake = async (
    narrative: string,
    meta: { name: string; age: string; gender: string }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/clinical-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawNarrative: narrative,
          patientMeta: meta,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const structuredRecord: ClinicalIntakeRecord = await response.json();

      setCurrentRecord(structuredRecord);
      setQueue((prev) => [structuredRecord, ...prev.filter((p) => p.id !== structuredRecord.id)]);
      // Clear draft storage on successful intake submission
      try {
        sessionStorage.removeItem(INTAKE_DRAFT_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to clear sessionStorage draft:', e);
      }
      // Scroll smoothly to summary
      setTimeout(() => {
        const summaryElement = document.getElementById('clinical-summary-view');
        if (summaryElement) {
          summaryElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      console.error('Intake processing error:', err);
      setError(err.message || 'Failed to process clinical narrative. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineWithAnswers = async (
    answeredQuestions: Array<{ question: string; answer: string; category: string }>
  ) => {
    if (!currentRecord) return;
    setIsRefining(true);
    setError(null);

    try {
      const response = await fetch('/api/refine-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentRecord,
          answeredQuestions,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to refine intake record.');
      }

      const updatedRecord: ClinicalIntakeRecord = await response.json();
      setCurrentRecord(updatedRecord);
      setQueue((prev) => prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item)));
    } catch (err: any) {
      console.error('Refinement error:', err);
      setError(err.message || 'Could not update HPI with clarification answers.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleUpdateMedRecon = (updatedReport: MedicationReconciliationReport) => {
    if (!currentRecord) return;
    const updated = {
      ...currentRecord,
      medicationReconciliation: updatedReport,
    };
    setCurrentRecord(updated);
    setQueue((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleSelectPreset = (preset: IntakePresetScenario) => {
    setActiveNarrative(preset.transcript);
    setError(null);
  };

  const handleNewEncounter = () => {
    setCurrentRecord(null);
    setActiveNarrative('');
    setActiveMeta({ name: '', age: '', gender: '' });
    try {
      sessionStorage.removeItem(INTAKE_DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear sessionStorage draft:', e);
    }
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearQueue = () => {
    if (confirm('Are you sure you want to clear the OPD patient queue and encounter history for this session?')) {
      setQueue([]);
      setCurrentRecord(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleReprintEncounter = (record: ClinicalIntakeRecord) => {
    setRecordToPrint(record);
    // Give browser a frame to render the printable slip
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDeleteEncounter = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    if (currentRecord?.id === id) {
      setCurrentRecord(null);
    }
  };

  const handleAttachVideoToRecord = (videoUrl: string, videoPrompt: string) => {
    setActiveNarrative((prev) =>
      prev
        ? `${prev}\n\n[Clinical Video Attached]: ${videoPrompt} -> ${videoUrl}`
        : `[Clinical Video Attached]: ${videoPrompt} -> ${videoUrl}`
    );
    if (currentRecord) {
      setCurrentRecord({
        ...currentRecord,
        physicianNoteDraft: {
          ...currentRecord.physicianNoteDraft,
          subjective: `${currentRecord.physicianNoteDraft.subjective}\n\n[Attached Veo Video: ${videoUrl}]: ${videoPrompt}`,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 selection:bg-teal-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        currentTriage={currentRecord?.patientMeta.triageLevel}
        patientCount={queue.length}
        onOpenQueue={() => setIsQueueOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isHistoryOpen={isHistoryOpen}
        onToggleDashboard={() => setIsDashboardOpen(!isDashboardOpen)}
        isDashboardOpen={isDashboardOpen}
        onNewEncounter={handleNewEncounter}
        isQueueOpen={isQueueOpen}
        onToggleChatbot={() => setIsChatbotOpen(!isChatbotOpen)}
        isChatbotOpen={isChatbotOpen}
        onOpenVideoGenerator={() => setIsVideoGenOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Info Alert Banner if Error */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-100 font-bold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Feature Highlight: Animate Images into Video with Veo */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-rose-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-rose-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Animate Clinical Images into Video
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  veo-3.1-fast-generate-preview
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload pathology photos, radiographs, joint articulations, or ultrasound scans to synthesize photorealistic videos in 16:9 or 9:16 aspect ratio.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsVideoGenOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Launch Veo Video Generator</span>
          </button>
        </div>

        {/* Clinical History Intake Input Form */}
        <IntakeInputForm
          onSubmit={handleProcessIntake}
          isLoading={isLoading}
          onSelectPreset={handleSelectPreset}
          initialNarrative={activeNarrative}
          initialMeta={activeMeta}
          onDraftCleared={() => {
            setActiveNarrative('');
            setActiveMeta({ name: '', age: '', gender: '' });
          }}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                AI Clinical Intake Engine Active
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                De-identifying national IDs &bull; Mapping narrative into SOCRATES dimensions &bull; Analyzing emergency red flags &bull; Drafting physician note
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-teal-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span>Synthesizing structured output...</span>
            </div>
          </div>
        )}

        {/* Structured Results Display */}
        {currentRecord && !isLoading && (
          <div id="clinical-summary-view" className="space-y-6 animate-fade-in">
            {/* Triage Banner with Red Flags & Redaction audit */}
            <TriageBanner
              triageLevel={currentRecord.patientMeta.triageLevel}
              triageReason={currentRecord.patientMeta.triageReason}
              redFlags={currentRecord.redFlags}
              redactedIdentifiers={currentRecord.patientMeta.redactedIdentifiers}
              encounterId={currentRecord.id}
              patientName={currentRecord.patientMeta.nameOrId}
              chiefComplaint={currentRecord.chiefComplaint.complaint}
            />

            {/* SOCRATES Core Framework Card */}
            <SocratesCard
              socrates={currentRecord.socratesHpi}
              chiefComplaint={currentRecord.chiefComplaint}
            />

            {/* Missing Context Clarification Questions Widget */}
            <ClarificationWidget
              questions={currentRecord.clarificationQuestions}
              onRefineWithAnswers={handleRefineWithAnswers}
              isRefining={isRefining}
            />

            {/* Clinical Medication Reconciliation & Safety Check Card */}
            <MedicationReconciliationCard
              report={currentRecord.medicationReconciliation}
              medications={currentRecord.medications}
              allergies={currentRecord.allergies}
              medicalConditions={currentRecord.pastHistory.medicalConditions}
              chiefComplaint={currentRecord.chiefComplaint.complaint}
              onUpdateReport={handleUpdateMedRecon}
            />

            {/* Extracted Clinical Entities (Medications, Allergies, Medical History, ROS) */}
            <ClinicalEntitiesView
              pastHistory={currentRecord.pastHistory}
              medications={currentRecord.medications}
              allergies={currentRecord.allergies}
              familyPersonalHistory={currentRecord.familyPersonalHistory}
              reviewOfSystems={currentRecord.reviewOfSystems}
              pertinentNegatives={currentRecord.physicianNoteDraft.pertinentNegatives}
            />

            {/* Physician SOAP Summary & EMR Copy Toolbar */}
            <PhysicianSoapView record={currentRecord} />
          </div>
        )}

        {/* Printable Slip for Browser Print (@media print) */}
        {(recordToPrint || currentRecord) && (
          <PrintableSlip record={recordToPrint || currentRecord!} />
        )}
      </main>

      {/* OPD Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        activeRecordId={currentRecord?.id}
        onSelectPatient={(selected) => setCurrentRecord(selected)}
        onClearQueue={handleClearQueue}
      />

      {/* Clinical Encounter History Drawer */}
      <EncounterHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        encounters={queue}
        activeRecordId={currentRecord?.id}
        onSelectEncounter={(selected) => {
          setCurrentRecord(selected);
          setTimeout(() => {
            const summaryElement = document.getElementById('clinical-summary-view');
            if (summaryElement) {
              summaryElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }}
        onReprintEncounter={handleReprintEncounter}
        onDeleteEncounter={handleDeleteEncounter}
        onClearHistory={handleClearQueue}
      />

      {/* Clinic Daily Throughput & Triage Analytics Dashboard */}
      <DailyThroughputDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        encounters={queue}
        onSelectEncounter={(selected) => {
          setCurrentRecord(selected);
          setTimeout(() => {
            const summaryElement = document.getElementById('clinical-summary-view');
            if (summaryElement) {
              summaryElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }}
        onOpenNewEncounter={handleNewEncounter}
      />

      {/* Gemini 3.8 Live Voice & Clinical Chatbot Drawer */}
      <ClinicalChatbotDrawer
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        currentRecord={currentRecord}
        onTransferToNarrative={(text) => {
          setActiveNarrative(text);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Veo 3.1 Fast Image-to-Video Generator Modal */}
      <ImageToVideoGenerator
        isOpen={isVideoGenOpen}
        onClose={() => setIsVideoGenOpen(false)}
        currentRecord={currentRecord}
        onAttachVideoToRecord={handleAttachVideoToRecord}
      />

      {/* Floating Action Button (FAB) for Instant Live Voice & Chat */}
      <button
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-teal-500 via-cyan-500 to-emerald-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-bold p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border border-teal-200/50 group"
        title="Open Gemini 3.8 Live Voice & Clinical Chatbot"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-slate-950" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
        </div>
        <span className="hidden sm:inline text-xs font-black tracking-wide uppercase">
          Live Voice & Chat
        </span>
      </button>
    </div>
  );
}
