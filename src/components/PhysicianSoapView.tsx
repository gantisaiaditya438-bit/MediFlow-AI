import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Printer,
  Code,
  ShieldCheck,
  Stethoscope,
  Info,
  Download,
} from 'lucide-react';
import { ClinicalIntakeRecord } from '../types';

interface PhysicianSoapViewProps {
  record: ClinicalIntakeRecord;
}

export const PhysicianSoapView: React.FC<PhysicianSoapViewProps> = ({ record }) => {
  const [copiedType, setCopiedType] = useState<'soap' | 'subjective' | 'json' | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  const formattedSoapText = `=====================================================
OUTPATIENT DEPARTMENT (OPD) CLINICAL INTAKE SUMMARY
Hospital / Clinic EMR Integration Record
Encounter ID: ${record.id} | Date/Time: ${new Date(record.timestamp).toLocaleString()}
Triage Level: ${record.patientMeta.triageLevel} (${record.patientMeta.triageReason})
Patient Name/ID: ${record.patientMeta.nameOrId} | Age/Sex: ${record.patientMeta.estimatedAgeGender || 'Unspecified'}
Privacy Status: National IDs scrubbed -> ${record.patientMeta.redactedIdentifiers?.join(', ') || 'No IDs detected'}
=====================================================

[CHIEF COMPLAINT]
* ${record.chiefComplaint.complaint} (${record.chiefComplaint.duration}, Urgency: ${record.chiefComplaint.urgencyTier})

[HISTORY OF PRESENT ILLNESS (HPI) - SOCRATES FRAMEWORK]
* Site: ${record.socratesHpi.site}
* Onset: ${record.socratesHpi.onset}
* Character: ${record.socratesHpi.character}
* Radiation: ${record.socratesHpi.radiation}
* Associations: ${record.socratesHpi.associations?.join(', ') || 'None reported'}
* Time Course: ${record.socratesHpi.timeCourse}
* Exacerbating / Relieving Factors: ${record.socratesHpi.exacerbatingRelievingFactors}
* Severity: ${record.socratesHpi.severity}

HPI Synthesized Summary:
${record.socratesHpi.summaryNarrative}

[PAST MEDICAL & SURGICAL HISTORY]
* Medical Conditions: ${record.pastHistory.medicalConditions?.map((c) => `${c.condition} (${c.durationOrYear || 'Duration unspecified'})`).join('; ') || 'None reported'}
* Surgical History: ${record.pastHistory.surgicalHistory?.map((s) => `${s.procedure} (${s.approximateYear || 'Year unspecified'})`).join('; ') || 'None reported'}

[MEDICATIONS & COMPLIANCE]
${record.medications?.map((m) => `- ${m.name} ${m.dose || ''} ${m.frequency || ''} [Compliance: ${m.compliance || 'Unknown'}, Indication: ${m.indication || '—'}]`).join('\n') || '- None reported'}

[ALLERGIES]
${record.allergies?.map((a) => `- ${a.allergen}: ${a.reactionType || 'Unspecified reaction'} [${a.isSevere ? 'SEVERE' : 'Standard'}]`).join('\n') || '- NKDA (No known drug allergies)'}

[FAMILY & PERSONAL/SOCIAL HISTORY]
* Family History: ${record.familyPersonalHistory?.familyHistory?.join('; ') || 'Non-contributory'}
* Tobacco / Alcohol: ${record.familyPersonalHistory?.socialPersonal?.tobaccoAlcohol || 'Not specified'}
* Occupation / Lifestyle: ${record.familyPersonalHistory?.socialPersonal?.occupationLifestyle || 'Not specified'}

[REVIEW OF SYSTEMS & PERTINENT NEGATIVES]
* Pertinent Negatives: ${record.physicianNoteDraft.pertinentNegatives?.join('; ') || 'None recorded'}
* Cardiovascular: ${record.reviewOfSystems?.cardiovascular?.join(', ') || 'Denies'}
* Respiratory: ${record.reviewOfSystems?.respiratory?.join(', ') || 'Denies'}
* GI: ${record.reviewOfSystems?.gastrointestinal?.join(', ') || 'Denies'}
* Neurological: ${record.reviewOfSystems?.neurological?.join(', ') || 'Denies'}

[RED-FLAG TRIAGE ALERTS]
${record.redFlags?.map((r) => `! [${r.severity}] ${r.symptom} -> Concern: ${r.clinicalConcern} (Action: ${r.immediateTriageAction})`).join('\n') || 'None detected'}

[MEDICATION RECONCILIATION & SAFETY CROSS-CHECK]
* Overall Safety Risk: ${record.medicationReconciliation?.overallRiskLevel || 'CLEAR'}
* Reconciliation Synthesis: ${record.medicationReconciliation?.summary || 'No contraindications detected'}
${record.medicationReconciliation?.issues?.map((iss) => `  - [${iss.severity}] ${iss.type} (Involving: ${iss.drugsOrEntitiesInvolved.join(', ')}): ${iss.clinicalConcern}\n    -> MD Recommendation: ${iss.physicianRecommendation}${iss.physicianOverrideNote ? `\n    -> Attending MD Note: ${iss.physicianOverrideNote}` : ''}`).join('\n') || '  - Regimen cleared for outpatient follow-up'}

[INTAKE CLINICAL CONTEXT]
${record.physicianNoteDraft.clinicalImpressionContext}

=====================================================
NOTE: Prepared by AI Clinical History Intake Assistant for Attending Physician review.
Strict Role Boundary: Data structuring only. No direct diagnosis or prescription issued to patient.
=====================================================`;

  const copyToClipboard = (text: string, type: 'soap' | 'subjective' | 'json') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Title & EMR Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            Physician SOAP Note & EMR Transfer
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Formatted for immediate paste into Epic, Cerner, Allscripts, or hospital EHR systems.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => copyToClipboard(record.physicianNoteDraft.subjective, 'subjective')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copiedType === 'subjective' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copiedType === 'subjective' ? 'Copied S!' : 'Copy Subjective'}</span>
          </button>

          <button
            onClick={() => copyToClipboard(formattedSoapText, 'soap')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 flex items-center gap-1.5 transition-colors"
          >
            {copiedType === 'soap' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-teal-400" />
            )}
            <span>{copiedType === 'soap' ? 'Copied Full Note!' : 'Copy Full Note'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print OPD Slip</span>
          </button>

          <button
            onClick={() => setShowJsonModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Code className="w-3.5 h-3.5 text-slate-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Structured SOAP Note Display */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 font-mono text-xs text-slate-300 space-y-4">
        <div>
          <span className="text-teal-400 font-bold block mb-1">
            [SUBJECTIVE / CLINICAL HPI]
          </span>
          <p className="leading-relaxed whitespace-pre-wrap font-sans text-slate-200 text-xs sm:text-sm">
            {record.physicianNoteDraft.subjective}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-900">
          <span className="text-indigo-400 font-bold block mb-1">
            [PERTINENT NEGATIVES ELICITED]
          </span>
          <p className="text-slate-300 font-sans text-xs">
            {record.physicianNoteDraft.pertinentNegatives?.length
              ? record.physicianNoteDraft.pertinentNegatives.join('; ')
              : 'None documented'}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-900">
          <span className="text-amber-400 font-bold block mb-1">
            [MEDICATION RECONCILIATION & SAFETY FLAGS]
          </span>
          <p className="text-slate-300 font-sans text-xs">
            {record.medicationReconciliation?.summary || 'No medication contraindications detected.'}
          </p>
          {record.medicationReconciliation?.issues && record.medicationReconciliation.issues.length > 0 && (
            <div className="mt-1 space-y-1 font-sans text-[11px]">
              {record.medicationReconciliation.issues.map((iss, i) => (
                <div key={i} className="text-slate-300 pl-2 border-l border-amber-500/40">
                  <span className="font-bold text-amber-300">[{iss.severity}] {iss.type.replace(/_/g, ' ')}:</span>{' '}
                  <span>{iss.drugsOrEntitiesInvolved.join(' + ')} &bull; {iss.clinicalConcern}</span>
                  {iss.physicianOverrideNote && (
                    <span className="block text-emerald-400 font-medium">MD Override: {iss.physicianOverrideNote}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-900">
          <span className="text-amber-400 font-bold block mb-1">
            [INTAKE TRIAGE CONTEXT FOR ATTENDING PHYSICIAN]
          </span>
          <p className="text-slate-300 font-sans text-xs leading-relaxed">
            {record.physicianNoteDraft.clinicalImpressionContext}
          </p>
        </div>
      </div>

      {/* Role-Bound Regulatory Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300 font-semibold">Attending Clinician Disclaimer:</strong>{' '}
          This structured intake summary was synthesized by an AI assistant bound strictly to data extraction and clinical organization. It is not an autonomous diagnosis or treatment prescription. The licensed attending physician must review all history, confirm allergies, and perform physical examinations.
        </div>
      </div>

      {/* JSON Schema Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-teal-400" />
                <h4 className="text-sm font-bold text-slate-100">
                  Strict Clinical Intake JSON Schema Export
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(record, null, 2), 'json')}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5"
                >
                  {copiedType === 'json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'json' ? 'Copied JSON!' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] bg-slate-950 text-emerald-400 leading-relaxed">
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
