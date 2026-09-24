import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Pill,
  RefreshCw,
  PlusCircle,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Check,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import {
  MedicationReconciliationReport,
  MedicationReconciliationIssue,
  MedicationItem,
  AllergyItem,
  MedicalHistoryItem,
} from '../types';

interface MedicationReconciliationCardProps {
  report?: MedicationReconciliationReport;
  medications: MedicationItem[];
  allergies: AllergyItem[];
  medicalConditions: MedicalHistoryItem[];
  chiefComplaint: string;
  onUpdateReport: (updatedReport: MedicationReconciliationReport) => void;
}

export const MedicationReconciliationCard: React.FC<MedicationReconciliationCardProps> = ({
  report,
  medications,
  allergies,
  medicalConditions,
  chiefComplaint,
  onUpdateReport,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedIndication, setNewMedIndication] = useState('');
  const [simError, setSimError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CONTRAINDICATED' | 'MAJOR' | 'MODERATE'>('ALL');
  const [overrideInputId, setOverrideInputId] = useState<string | null>(null);
  const [overrideNote, setOverrideNote] = useState('');

  const issues = report?.issues || [];
  const riskLevel = report?.overallRiskLevel || (issues.length > 0 ? 'HIGH_RISK' : 'CLEAR');

  const filteredIssues = issues.filter((item) => {
    if (activeFilter === 'ALL') return true;
    return item.severity === activeFilter;
  });

  const handleToggleReview = (issueId: string) => {
    if (!report) return;
    const updatedIssues = report.issues.map((issue) => {
      if (issue.id === issueId) {
        return { ...issue, reviewed: !issue.reviewed };
      }
      return issue;
    });
    onUpdateReport({ ...report, issues: updatedIssues });
  };

  const handleSaveOverrideNote = (issueId: string) => {
    if (!report) return;
    const updatedIssues = report.issues.map((issue) => {
      if (issue.id === issueId) {
        return {
          ...issue,
          reviewed: true,
          physicianOverrideNote: overrideNote.trim(),
        };
      }
      return issue;
    });
    onUpdateReport({ ...report, issues: updatedIssues });
    setOverrideInputId(null);
    setOverrideNote('');
  };

  const handleSimulateNewMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    setIsSimulating(true);
    setSimError(null);

    const testMedList: MedicationItem[] = [
      ...medications,
      {
        name: newMedName.trim(),
        dose: newMedDose.trim() || 'Standard dose',
        frequency: 'As prescribed',
        indication: newMedIndication.trim() || 'Simulated addition',
        compliance: 'Reported regular',
      },
    ];

    try {
      const response = await fetch('/api/reconcile-medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: testMedList,
          pastHistory: { medicalConditions },
          allergies,
          currentSymptoms: chiefComplaint,
        }),
      });

      if (!response.ok) {
        throw new Error('Reconciliation simulation failed.');
      }

      const updatedReport: MedicationReconciliationReport = await response.json();
      onUpdateReport(updatedReport);
      setNewMedName('');
      setNewMedDose('');
      setNewMedIndication('');
    } catch (err: any) {
      setSimError(err.message || 'Failed to simulate medication reconciliation.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRerunReconciliation = async () => {
    setIsSimulating(true);
    setSimError(null);
    try {
      const response = await fetch('/api/reconcile-medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications,
          pastHistory: { medicalConditions },
          allergies,
          currentSymptoms: chiefComplaint,
        }),
      });
      if (!response.ok) throw new Error('Failed to refresh reconciliation.');
      const updatedReport: MedicationReconciliationReport = await response.json();
      onUpdateReport(updatedReport);
    } catch (err: any) {
      setSimError(err.message || 'Failed to refresh reconciliation.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header & Risk Level Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Clinical Medication Reconciliation & Safety Check
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                riskLevel === 'HIGH_RISK'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : riskLevel === 'MODERATE_RISK'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {riskLevel.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated cross-check of Current Medications against Past Medical History, Allergies & DDI databases.
          </p>
        </div>

        <button
          onClick={handleRerunReconciliation}
          disabled={isSimulating}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-teal-300 border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Reconciling...' : 'Re-run Safety Check'}</span>
        </button>
      </div>

      {/* Synthesis Summary Banner */}
      <div
        className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
          riskLevel === 'HIGH_RISK'
            ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
            : riskLevel === 'MODERATE_RISK'
            ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
        }`}
      >
        {riskLevel === 'HIGH_RISK' ? (
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        ) : riskLevel === 'MODERATE_RISK' ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <span className="font-bold block text-sm">
            {report?.summary || (issues.length > 0 ? `${issues.length} Medication Safety Concern(s) Identified` : 'Clean Medication Safety Profile')}
          </span>
          <span className="text-[11px] opacity-90 block mt-0.5">
            Cross-referenced {medications.length} active medication(s), {medicalConditions.length} chronic condition(s), and {allergies.length} allergy record(s).
          </span>
        </div>
      </div>

      {/* Quick Filter Bar */}
      {issues.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Filter Concerns:</span>
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                activeFilter === 'ALL'
                  ? 'bg-slate-800 text-teal-300 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({issues.length})
            </button>
            <button
              onClick={() => setActiveFilter('CONTRAINDICATED')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                activeFilter === 'CONTRAINDICATED'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Contraindicated ({issues.filter((i) => i.severity === 'CONTRAINDICATED').length})
            </button>
            <button
              onClick={() => setActiveFilter('MAJOR')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                activeFilter === 'MAJOR'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Major ({issues.filter((i) => i.severity === 'MAJOR').length})
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Reviewed: {issues.filter((i) => i.reviewed).length} / {issues.length}
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
            <h4 className="text-xs font-bold text-slate-200">No Medication Conflicts Detected</h4>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Current regimen aligns with past medical history, no cross-reactivity with reported allergies, and no high-risk drug-drug interactions detected.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isContraindicated = issue.severity === 'CONTRAINDICATED';
            const isMajor = issue.severity === 'MAJOR';

            return (
              <div
                key={issue.id}
                className={`p-4 rounded-xl border transition-all ${
                  issue.reviewed
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-80'
                    : isContraindicated
                    ? 'bg-rose-950/20 border-rose-700/60 ring-1 ring-rose-500/20'
                    : isMajor
                    ? 'bg-amber-950/20 border-amber-700/60 ring-1 ring-amber-500/20'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                {/* Issue Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        isContraindicated
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : isMajor
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                      }`}
                    >
                      {issue.severity}
                    </span>

                    <span className="text-xs font-bold text-slate-200">
                      {issue.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleReview(issue.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        issue.reviewed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {issue.reviewed ? (
                        <>
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reviewed by MD</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Acknowledge Concern</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setOverrideInputId(overrideInputId === issue.id ? null : issue.id);
                        setOverrideNote(issue.physicianOverrideNote || '');
                      }}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700"
                    >
                      {issue.physicianOverrideNote ? 'Edit MD Note' : '+ Clinical Note'}
                    </button>
                  </div>
                </div>

                {/* Conflict Entity Pills */}
                <div className="flex items-center gap-1.5 flex-wrap my-2">
                  <span className="text-[11px] text-slate-400 font-medium">Involves:</span>
                  {issue.drugsOrEntitiesInvolved?.map((entity, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-900 border border-slate-700 text-teal-300"
                    >
                      {entity}
                    </span>
                  ))}
                </div>

                {/* Pathophysiology & Clinical Concern */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                  <span className="text-rose-400 font-bold block text-[11px] uppercase tracking-wider">
                    Pharmacological & Clinical Concern:
                  </span>
                  <p className="leading-relaxed">{issue.clinicalConcern}</p>
                </div>

                {/* Actionable Physician Recommendation */}
                <div className="mt-2 p-2.5 rounded-lg bg-teal-950/20 border border-teal-800/40 text-xs text-teal-200 space-y-1">
                  <span className="text-teal-400 font-bold block text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" />
                    Physician Action Recommendation:
                  </span>
                  <p className="leading-relaxed text-slate-200">{issue.physicianRecommendation}</p>
                </div>

                {/* Physician Override Note if exists */}
                {issue.physicianOverrideNote && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-900 border border-emerald-500/30 text-xs text-slate-300">
                    <span className="font-bold text-emerald-400 block text-[10px] uppercase">
                      Attending Physician Clinical Override / Action Taken:
                    </span>
                    <p className="italic">{issue.physicianOverrideNote}</p>
                  </div>
                )}

                {/* Inline Override Input Modal/Drawer */}
                {overrideInputId === issue.id && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-700 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Record Physician Action / Override Decision Note:
                    </label>
                    <textarea
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="e.g. Discontinued NSAID; prescribed Pantoprazole 40mg OD and Paracetamol for analgesia. Patient instructed on GI bleed red flags."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setOverrideInputId(null)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveOverrideNote(issue.id)}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Save Clinical Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Regimen Simulator: Test Adding a New Medication */}
      <div className="pt-3 border-t border-slate-800">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Prescription Safety Pre-Check Simulator
              </h4>
            </div>
            <span className="text-[10px] text-slate-500">
              Test adding an antimicrobial or analgesic before writing Rx
            </span>
          </div>

          <form onSubmit={handleSimulateNewMed} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
              placeholder="Drug name (e.g. Amoxicillin, Diclofenac)"
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <input
              type="text"
              value={newMedDose}
              onChange={(e) => setNewMedDose(e.target.value)}
              placeholder="Dose (e.g. 500mg TDS)"
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <input
              type="text"
              value={newMedIndication}
              onChange={(e) => setNewMedIndication(e.target.value)}
              placeholder="Indication (e.g. Acute infection)"
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={isSimulating || !newMedName.trim()}
              className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Checking...' : 'Check Interaction'}</span>
            </button>
          </form>

          {simError && (
            <p className="text-[11px] text-rose-400 font-medium">{simError}</p>
          )}
        </div>
      </div>
    </div>
  );
};
