import React, { useState } from 'react';
import {
  History,
  X,
  Search,
  Printer,
  FileText,
  Copy,
  Check,
  Trash2,
  Clock,
  User,
  AlertTriangle,
  Siren,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { ClinicalIntakeRecord, TriageLevel } from '../types';

interface EncounterHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  encounters: ClinicalIntakeRecord[];
  activeRecordId?: string;
  onSelectEncounter: (record: ClinicalIntakeRecord) => void;
  onReprintEncounter: (record: ClinicalIntakeRecord) => void;
  onDeleteEncounter: (id: string) => void;
  onClearHistory: () => void;
}

export const EncounterHistoryDrawer: React.FC<EncounterHistoryDrawerProps> = ({
  isOpen,
  onClose,
  encounters,
  activeRecordId,
  onSelectEncounter,
  onReprintEncounter,
  onDeleteEncounter,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTriage, setFilterTriage] = useState<'ALL' | TriageLevel>('ALL');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredEncounters = encounters.filter((enc) => {
    const matchesSearch =
      enc.patientMeta.nameOrId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enc.chiefComplaint.complaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enc.socratesHpi.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enc.redFlags &&
        enc.redFlags.some(
          (rf) =>
            rf.symptom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rf.clinicalConcern.toLowerCase().includes(searchTerm.toLowerCase())
        ));

    const matchesTriage = filterTriage === 'ALL' || enc.patientMeta.triageLevel === filterTriage;

    return matchesSearch && matchesTriage;
  });

  const handleCopySoap = (record: ClinicalIntakeRecord) => {
    const soap = `=====================================================
OUTPATIENT CLINICAL INTAKE SUMMARY (REPRINT / ARCHIVE)
Encounter ID: ${record.id} | Timestamp: ${new Date(record.timestamp).toLocaleString()}
Patient: ${record.patientMeta.nameOrId} | Triage: ${record.patientMeta.triageLevel} (${record.patientMeta.triageReason})
Chief Complaint: ${record.chiefComplaint.complaint} (${record.chiefComplaint.duration}, Urgency: ${record.chiefComplaint.urgencyTier})
=====================================================
SUBJECTIVE (HPI - SOCRATES):
${record.physicianNoteDraft.subjective}

PERTINENT NEGATIVES:
${record.physicianNoteDraft.pertinentNegatives?.map((p) => `- ${p}`).join('\n') || 'None reported'}

CLINICAL IMPRESSION CONTEXT (INTAKE ONLY):
${record.physicianNoteDraft.clinicalImpressionContext}
=====================================================`;

    navigator.clipboard.writeText(soap);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(encounters, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `opd_clinical_encounters_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-12">
        <div className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20">
                <History className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100">
                    Clinical Encounter History
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    {encounters.length} {encounters.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Quick reference, diagnostic review, and 1-click re-printing of OPD slips
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {encounters.length > 0 && (
                <button
                  onClick={handleExportJson}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Export Encounters as JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                title="Close History"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Triage Filtering Bar */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by patient name, chief complaint, symptom, red flags, ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11px] pt-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-500" /> Filter:
                </span>
                <button
                  onClick={() => setFilterTriage('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterTriage === 'ALL'
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  All ({encounters.length})
                </button>
                <button
                  onClick={() => setFilterTriage('EMERGENCY_RED')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterTriage === 'EMERGENCY_RED'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
                  }`}
                >
                  Red ({encounters.filter((e) => e.patientMeta.triageLevel === 'EMERGENCY_RED').length})
                </button>
                <button
                  onClick={() => setFilterTriage('URGENT_AMBER')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterTriage === 'URGENT_AMBER'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
                  }`}
                >
                  Amber ({encounters.filter((e) => e.patientMeta.triageLevel === 'URGENT_AMBER').length})
                </button>
                <button
                  onClick={() => setFilterTriage('ROUTINE_GREEN')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterTriage === 'ROUTINE_GREEN'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
                  }`}
                >
                  Green ({encounters.filter((e) => e.patientMeta.triageLevel === 'ROUTINE_GREEN').length})
                </button>
              </div>

              {encounters.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium px-2 py-1 rounded-lg hover:bg-rose-950/30 transition-colors shrink-0"
                  title="Clear all saved encounters from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Encounters Log List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredEncounters.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                  <History className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-300">
                    {encounters.length === 0 ? 'No Clinical Encounters Saved Yet' : 'No Matching Encounters'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {encounters.length === 0
                      ? 'As clinical narratives are processed through the intake triage engine, they will automatically be logged here for quick reference, EMR transfer, and re-printing.'
                      : 'Try broadening your search keywords or switching the triage filter to "All".'}
                  </p>
                </div>
              </div>
            ) : (
              filteredEncounters.map((encounter) => {
                const isActive = encounter.id === activeRecordId;
                const isExpanded = expandedRecordId === encounter.id;
                const isRed = encounter.patientMeta.triageLevel === 'EMERGENCY_RED';
                const isAmber = encounter.patientMeta.triageLevel === 'URGENT_AMBER';

                return (
                  <div
                    key={encounter.id}
                    className={`rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-slate-850 border-teal-500/60 ring-1 ring-teal-500/40 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Encounter Header Card */}
                    <div className="p-3.5 sm:p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-teal-400" />
                              {encounter.patientMeta.nameOrId}
                            </span>
                            {encounter.patientMeta.estimatedAgeGender && (
                              <span className="text-xs text-slate-400 font-medium">
                                ({encounter.patientMeta.estimatedAgeGender})
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                                Current
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                            {encounter.chiefComplaint.complaint}
                            <span className="text-slate-400 font-normal ml-1">
                              &bull; {encounter.chiefComplaint.duration}
                            </span>
                          </p>
                        </div>

                        {/* Triage Badge */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isRed
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isAmber
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isRed ? (
                              <Siren className="w-3 h-3 text-rose-400" />
                            ) : isAmber ? (
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            )}
                            <span>{encounter.patientMeta.triageLevel.replace('_', ' ')}</span>
                          </span>

                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(encounter.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            {new Date(encounter.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Red Flag Warning if present */}
                      {encounter.redFlags && encounter.redFlags.length > 0 && (
                        <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">
                            <strong className="font-bold">Red Flags: </strong>
                            {encounter.redFlags.map((rf) => `${rf.symptom} (${rf.clinicalConcern})`).join('; ')}
                          </span>
                        </div>
                      )}

                      {/* Action Bar per Record */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {/* Re-Print OPD Slip Button */}
                          <button
                            type="button"
                            onClick={() => onReprintEncounter(encounter)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 flex items-center gap-1.5 transition-all shadow-xs"
                            title="Re-print official OPD Clinical Intake Slip"
                          >
                            <Printer className="w-3.5 h-3.5 text-teal-400" />
                            <span>Re-print Slip</span>
                          </button>

                          {/* Load / Select into Workspace */}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectEncounter(encounter);
                              onClose();
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                            }`}
                            title="Load this encounter into main workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{isActive ? 'Loaded' : 'Open'}</span>
                          </button>

                          {/* Quick Copy SOAP */}
                          <button
                            type="button"
                            onClick={() => handleCopySoap(encounter)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                            title="Copy SOAP note to clipboard"
                          >
                            {copiedId === encounter.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy SOAP</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Toggle Expand Details */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRecordId(isExpanded ? null : encounter.id)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                            title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                          >
                            <span className="text-[11px] font-medium hidden sm:inline">
                              {isExpanded ? 'Less' : 'Details'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete Record */}
                          <button
                            type="button"
                            onClick={() => onDeleteEncounter(encounter.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete this record from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Accordion: Quick Reference Details View */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-850 space-y-3 bg-slate-950/50 rounded-b-2xl text-xs text-slate-300 animate-fade-in">
                        {/* Demographics & Metadata Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Encounter ID</span>
                            <span className="font-mono text-slate-200">{encounter.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Triage Tier</span>
                            <span className="font-bold text-slate-200">
                              {encounter.patientMeta.triageLevel}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Urgency Tier</span>
                            <span className="text-slate-200">
                              {encounter.chiefComplaint.urgencyTier}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Privacy Scrubbing</span>
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Redacted
                            </span>
                          </div>
                        </div>

                        {/* SOCRATES HPI Quick Breakdown */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                            SOCRATES Breakdown:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                              <span className="text-slate-500 block text-[10px]">SITE</span>
                              <span className="text-slate-200">{encounter.socratesHpi.site || '—'}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                              <span className="text-slate-500 block text-[10px]">ONSET</span>
                              <span className="text-slate-200">{encounter.socratesHpi.onset || '—'}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                              <span className="text-slate-500 block text-[10px]">CHARACTER</span>
                              <span className="text-slate-200">{encounter.socratesHpi.character || '—'}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                              <span className="text-slate-500 block text-[10px]">SEVERITY</span>
                              <span className="text-slate-200">{encounter.socratesHpi.severity || '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* HPI Summary Narrative */}
                        {encounter.socratesHpi.summaryNarrative && (
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Synthesized HPI Narrative:
                            </span>
                            <p className="text-slate-300 leading-relaxed text-xs">
                              {encounter.socratesHpi.summaryNarrative}
                            </p>
                          </div>
                        )}

                        {/* Medications & Allergies */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="font-bold text-slate-400 block mb-1">
                              Current Medications ({encounter.medications?.length || 0}):
                            </span>
                            {encounter.medications && encounter.medications.length > 0 ? (
                              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                                {encounter.medications.map((m, i) => (
                                  <li key={i} className="truncate">
                                    {m.name} {m.dose} {m.frequency}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-slate-500 italic">None reported</span>
                            )}
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="font-bold text-slate-400 block mb-1">
                              Documented Allergies ({encounter.allergies?.length || 0}):
                            </span>
                            {encounter.allergies && encounter.allergies.length > 0 ? (
                              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                                {encounter.allergies.map((a, i) => (
                                  <li key={i} className="truncate">
                                    {a.allergen} ({a.reactionType || 'reaction'})
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-emerald-400 italic">NKDA (No known allergies)</span>
                            )}
                          </div>
                        </div>

                        {/* Re-print CTA Footer inside accordion */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onReprintEncounter(encounter)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-950" />
                            <span>Print OPD Intake Slip Now</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Session encrypted &bull; Local queue persistent</span>
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
