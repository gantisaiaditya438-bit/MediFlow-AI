import React, { useState } from 'react';
import {
  Pill,
  AlertOctagon,
  History,
  Users,
  Layers,
  HeartPulse,
  Wind,
  Stethoscope,
  Brain,
  Bone,
  Thermometer,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  MedicalHistoryItem,
  SurgicalHistoryItem,
  MedicationItem,
  AllergyItem,
  ReviewOfSystems,
} from '../types';

interface ClinicalEntitiesViewProps {
  pastHistory: {
    medicalConditions: MedicalHistoryItem[];
    surgicalHistory: SurgicalHistoryItem[];
  };
  medications: MedicationItem[];
  allergies: AllergyItem[];
  familyPersonalHistory: {
    familyHistory: string[];
    socialPersonal: {
      tobaccoAlcohol?: string;
      occupationLifestyle?: string;
      dietActivity?: string;
    };
  };
  reviewOfSystems: ReviewOfSystems;
  pertinentNegatives: string[];
}

export const ClinicalEntitiesView: React.FC<ClinicalEntitiesViewProps> = ({
  pastHistory,
  medications,
  allergies,
  familyPersonalHistory,
  reviewOfSystems,
  pertinentNegatives,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'meds' | 'history' | 'ros'>('all');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Section Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            Extracted Clinical Entities & Comprehensive Intake
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Prescriptions, past medical/surgical timeline, allergy profile, and Review of Systems.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              activeTab === 'all'
                ? 'bg-slate-800 text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Entities
          </button>
          <button
            onClick={() => setActiveTab('meds')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              activeTab === 'meds'
                ? 'bg-slate-800 text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Medications ({medications.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              activeTab === 'history'
                ? 'bg-slate-800 text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Past History
          </button>
          <button
            onClick={() => setActiveTab('ros')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              activeTab === 'ros'
                ? 'bg-slate-800 text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Review of Systems
          </button>
        </div>
      </div>

      {/* 1. Medications & Allergies Grid */}
      {(activeTab === 'all' || activeTab === 'meds') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Medications Table (Span 2) */}
          <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-indigo-400" />
                Current Medications & Adherence ({medications.length})
              </h4>
              <span className="text-[10px] text-slate-400">Dosage, frequency & compliance</span>
            </div>

            {medications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-2">Medication</th>
                      <th className="pb-2">Dose / Frequency</th>
                      <th className="pb-2">Indication</th>
                      <th className="pb-2">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {medications.map((med, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="py-2.5 font-bold text-slate-100">{med.name}</td>
                        <td className="py-2.5 text-slate-300">
                          {med.dose || '—'} {med.frequency ? `(${med.frequency})` : ''}
                        </td>
                        <td className="py-2.5 text-slate-400">{med.indication || '—'}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              med.compliance === 'Reported regular'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : med.compliance === 'Irregular' || med.compliance === 'Non-compliant'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {med.compliance || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No active regular medications reported in narrative.
              </p>
            )}
          </div>

          {/* Allergies Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  Allergies ({allergies.length})
                </h4>
                <span className="text-[10px] text-slate-400">Hypersensitivity Log</span>
              </div>

              {allergies.length > 0 ? (
                <div className="space-y-2">
                  {allergies.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                        item.isSevere
                          ? 'bg-rose-950/30 border-rose-600/50 text-rose-200'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{item.allergen}</span>
                        <span className="text-[11px] text-slate-400">
                          {item.reactionType || 'Reaction unspecified'}
                        </span>
                      </div>
                      {item.isSevere && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                          Severe
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-80" />
                  <p className="text-xs text-slate-300 font-medium">No Known Drug Allergies (NKDA)</p>
                  <p className="text-[10px] text-slate-500">None reported in intake narrative</p>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500">
              Always confirm allergy history with patient prior to prescribing.
            </div>
          </div>
        </div>
      )}

      {/* 2. Past Medical & Surgical History */}
      {(activeTab === 'all' || activeTab === 'history') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Medical Conditions */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <History className="w-3.5 h-3.5 text-sky-400" />
              Past Medical Conditions ({pastHistory.medicalConditions?.length || 0})
            </h4>

            {pastHistory.medicalConditions && pastHistory.medicalConditions.length > 0 ? (
              <div className="space-y-2">
                {pastHistory.medicalConditions.map((cond, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{cond.condition}</span>
                      {cond.durationOrYear && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {cond.durationOrYear}
                        </span>
                      )}
                    </div>
                    {cond.notes && <p className="text-[11px] text-slate-400 mt-1">{cond.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No significant past medical conditions elicited.</p>
            )}
          </div>

          {/* Surgical History & Personal/Social */}
          <div className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                Past Surgical History ({pastHistory.surgicalHistory?.length || 0})
              </h4>
              {pastHistory.surgicalHistory && pastHistory.surgicalHistory.length > 0 ? (
                <div className="space-y-2">
                  {pastHistory.surgicalHistory.map((surg, i) => (
                    <div key={i} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex justify-between items-center">
                      <span className="font-bold text-slate-200">{surg.procedure}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{surg.approximateYear || '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No previous surgical interventions reported.</p>
              )}
            </div>

            {/* Family & Social Summary */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Family & Personal/Social History
              </h4>
              <div className="text-xs space-y-1.5 text-slate-300">
                {familyPersonalHistory.familyHistory && familyPersonalHistory.familyHistory.length > 0 && (
                  <div>
                    <span className="text-slate-400 font-semibold">Family: </span>
                    <span>{familyPersonalHistory.familyHistory.join('; ')}</span>
                  </div>
                )}
                {familyPersonalHistory.socialPersonal?.tobaccoAlcohol && (
                  <div>
                    <span className="text-slate-400 font-semibold">Tobacco / Alcohol: </span>
                    <span>{familyPersonalHistory.socialPersonal.tobaccoAlcohol}</span>
                  </div>
                )}
                {familyPersonalHistory.socialPersonal?.occupationLifestyle && (
                  <div>
                    <span className="text-slate-400 font-semibold">Occupation / Lifestyle: </span>
                    <span>{familyPersonalHistory.socialPersonal.occupationLifestyle}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Review of Systems (ROS) & Pertinent Negatives */}
      {(activeTab === 'all' || activeTab === 'ros') && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Review of Systems (ROS) Grid
            </h4>
            <span className="text-[10px] text-slate-400">Organ system symptom inventory</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Cardiovascular */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Cardiovascular</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {reviewOfSystems?.cardiovascular?.length
                  ? reviewOfSystems.cardiovascular.join(', ')
                  : 'Denies palpitations, syncope, ankle swelling'}
              </p>
            </div>

            {/* Respiratory */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sky-300 mb-1">
                <Wind className="w-3.5 h-3.5" />
                <span>Respiratory</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {reviewOfSystems?.respiratory?.length
                  ? reviewOfSystems.respiratory.join(', ')
                  : 'No hemoptysis, stridor, or wheezing reported'}
              </p>
            </div>

            {/* Gastrointestinal */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Gastrointestinal</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {reviewOfSystems?.gastrointestinal?.length
                  ? reviewOfSystems.gastrointestinal.join(', ')
                  : 'No hematemesis, melena, or dysphagia reported'}
              </p>
            </div>

            {/* Neurological */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-300 mb-1">
                <Brain className="w-3.5 h-3.5" />
                <span>Neurological</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {reviewOfSystems?.neurological?.length
                  ? reviewOfSystems.neurological.join(', ')
                  : 'No seizures, numbness, or loss of consciousness'}
              </p>
            </div>

            {/* Musculoskeletal */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-teal-300 mb-1">
                <Bone className="w-3.5 h-3.5" />
                <span>Musculoskeletal</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {reviewOfSystems?.musculoskeletal?.length
                  ? reviewOfSystems.musculoskeletal.join(', ')
                  : 'No joint swelling or severe muscle tenderness'}
              </p>
            </div>

            {/* Constitutional */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-orange-300 mb-1">
                <Thermometer className="w-3.5 h-3.5" />
                <span>Constitutional</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {reviewOfSystems?.constitutional?.length
                  ? reviewOfSystems.constitutional.join(', ')
                  : 'No unexplained chills, fevers, or weight loss'}
              </p>
            </div>
          </div>

          {/* Pertinent Negatives Pills */}
          {pertinentNegatives && pertinentNegatives.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 mb-2">
                <XCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Pertinent Negatives (Clinically Ruled-Out Symptoms)
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {pertinentNegatives.map((neg, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-900 border border-slate-700/80 text-slate-300 text-xs px-2.5 py-1 rounded-lg"
                  >
                    &bull; {neg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
