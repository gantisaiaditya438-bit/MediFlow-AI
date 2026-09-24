import React from 'react';
import { ClinicalIntakeRecord } from '../types';

interface PrintableSlipProps {
  record: ClinicalIntakeRecord;
}

export const PrintableSlip: React.FC<PrintableSlipProps> = ({ record }) => {
  return (
    <div className="hidden print:block p-8 bg-white text-black font-sans text-xs max-w-4xl mx-auto">
      {/* Clinic Header */}
      <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">
            Metropolitan Outpatient Department (OPD)
          </h1>
          <p className="text-xs text-gray-700">
            Clinical History Intake & Triage Assessment Slip &bull; EMR Pre-Consultation
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold border-2 border-black px-2 py-0.5 inline-block">
            {record.patientMeta.triageLevel.replace('_', ' ')}
          </div>
          <p className="text-[10px] text-gray-600 mt-1">ID: {record.id}</p>
        </div>
      </div>

      {/* Patient Demographics */}
      <div className="grid grid-cols-4 gap-2 pb-3 mb-3 border-b border-gray-300">
        <div>
          <span className="font-bold text-gray-600 block text-[10px]">PATIENT NAME / ID:</span>
          <span className="font-semibold text-sm">{record.patientMeta.nameOrId}</span>
        </div>
        <div>
          <span className="font-bold text-gray-600 block text-[10px]">AGE / GENDER:</span>
          <span>{record.patientMeta.estimatedAgeGender || 'Unspecified'}</span>
        </div>
        <div>
          <span className="font-bold text-gray-600 block text-[10px]">ENCOUNTER DATE:</span>
          <span>{new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div>
          <span className="font-bold text-gray-600 block text-[10px]">PRIVACY STATUS:</span>
          <span className="font-mono text-[10px]">Govt IDs Redacted</span>
        </div>
      </div>

      {/* Chief Complaint */}
      <div className="mb-3 bg-gray-100 p-2 border border-gray-300">
        <span className="font-bold text-xs">CHIEF COMPLAINT: </span>
        <span className="font-semibold">{record.chiefComplaint.complaint}</span>
        <span className="ml-3 text-gray-700 font-medium">({record.chiefComplaint.duration}, Tier: {record.chiefComplaint.urgencyTier})</span>
      </div>

      {/* Red Flags Alert if any */}
      {record.redFlags && record.redFlags.length > 0 && (
        <div className="mb-3 p-2 border-2 border-red-600 bg-red-50 text-red-950">
          <span className="font-bold text-red-700 block">*** TRIAGE RED FLAGS DETECTED ***</span>
          {record.redFlags.map((rf, idx) => (
            <div key={idx} className="mt-1">
              <strong>{rf.symptom}</strong> - Clinical Concern: {rf.clinicalConcern} (Action: {rf.immediateTriageAction})
            </div>
          ))}
        </div>
      )}

      {/* HPI - SOCRATES Framework */}
      <div className="mb-3">
        <h2 className="font-bold text-xs border-b border-gray-400 pb-1 mb-1.5 uppercase">
          History of Present Illness (SOCRATES Breakdown)
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-2">
          <div><strong>Site:</strong> {record.socratesHpi.site}</div>
          <div><strong>Onset:</strong> {record.socratesHpi.onset}</div>
          <div><strong>Character:</strong> {record.socratesHpi.character}</div>
          <div><strong>Radiation:</strong> {record.socratesHpi.radiation}</div>
          <div><strong>Associations:</strong> {record.socratesHpi.associations?.join(', ') || 'None'}</div>
          <div><strong>Time Course:</strong> {record.socratesHpi.timeCourse}</div>
          <div><strong>Exacerbating / Relieving:</strong> {record.socratesHpi.exacerbatingRelievingFactors}</div>
          <div><strong>Severity:</strong> {record.socratesHpi.severity}</div>
        </div>
        <p className="p-2 bg-gray-50 border border-gray-200 italic text-[11px]">
          {record.socratesHpi.summaryNarrative}
        </p>
      </div>

      {/* Medical History & Medications */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <h2 className="font-bold text-xs border-b border-gray-400 pb-1 mb-1 uppercase">
            Past Medical / Surgical History
          </h2>
          <ul className="list-disc pl-4 text-[11px] space-y-0.5">
            {record.pastHistory.medicalConditions?.map((c, i) => (
              <li key={i}>{c.condition} {c.durationOrYear ? `(${c.durationOrYear})` : ''}</li>
            ))}
            {record.pastHistory.surgicalHistory?.map((s, i) => (
              <li key={i}>Surg: {s.procedure} {s.approximateYear ? `(${s.approximateYear})` : ''}</li>
            ))}
            {(!record.pastHistory.medicalConditions?.length && !record.pastHistory.surgicalHistory?.length) && (
              <li>No significant history reported</li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-xs border-b border-gray-400 pb-1 mb-1 uppercase">
            Medications & Allergies
          </h2>
          <div className="text-[11px]">
            <strong>Allergies: </strong>
            {record.allergies?.length
              ? record.allergies.map((a) => `${a.allergen} (${a.reactionType || 'reaction'}, ${a.isSevere ? 'SEVERE' : 'mild'})`).join('; ')
              : 'No Known Drug Allergies (NKDA)'}
          </div>
          <div className="mt-1 text-[11px]">
            <strong>Current Meds:</strong>
            <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
              {record.medications?.map((m, i) => (
                <li key={i}>{m.name} {m.dose || ''} {m.frequency || ''} - {m.compliance || 'Adherence unknown'}</li>
              ))}
              {!record.medications?.length && <li>No current regular medications</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Medication Reconciliation Safety Section */}
      {record.medicationReconciliation && record.medicationReconciliation.issues?.length > 0 && (
        <div className="mb-3 p-2 border border-black bg-gray-50">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-xs uppercase">
              Medication Reconciliation Safety Flags ({record.medicationReconciliation.overallRiskLevel.replace('_', ' ')})
            </span>
            <span className="text-[10px] italic">Physician Pre-Prescribing Alert</span>
          </div>
          <p className="text-[10px] text-gray-800 mb-1">{record.medicationReconciliation.summary}</p>
          <ul className="list-disc pl-4 text-[10px] space-y-0.5">
            {record.medicationReconciliation.issues.map((iss, i) => (
              <li key={i}>
                <strong>[{iss.severity}] {iss.type.replace(/_/g, ' ')} ({iss.drugsOrEntitiesInvolved.join(' + ')}):</strong>{' '}
                {iss.clinicalConcern} &bull; <em>Rec: {iss.physicianRecommendation}</em>
                {iss.physicianOverrideNote && (
                  <span className="block font-semibold underline">MD Override Action: {iss.physicianOverrideNote}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pertinent Negatives */}
      {record.physicianNoteDraft.pertinentNegatives?.length > 0 && (
        <div className="mb-3 text-[11px]">
          <span className="font-bold">Pertinent Negatives: </span>
          <span>{record.physicianNoteDraft.pertinentNegatives.join('; ')}</span>
        </div>
      )}

      {/* Attending Physician Sign-off */}
      <div className="mt-8 pt-4 border-t border-black grid grid-cols-2 gap-8 text-[11px]">
        <div>
          <p className="text-gray-500 mb-6">AI Intake Triage Assistant Verification Timestamp: {new Date(record.timestamp).toISOString()}</p>
          <p className="text-[10px] text-gray-600">Disclaimer: Data structuring assistant only. Attending physician must examine and diagnose patient.</p>
        </div>
        <div className="text-right">
          <div className="border-b border-black w-48 ml-auto mb-1"></div>
          <span className="font-bold">Attending Physician Signature & Seal</span>
        </div>
      </div>
    </div>
  );
};
