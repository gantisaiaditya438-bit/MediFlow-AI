/**
 * Clinical Intake & OPD Triage Data Structures
 */

export type TriageLevel = 'EMERGENCY_RED' | 'URGENT_AMBER' | 'ROUTINE_GREEN';

export interface SocratesHPI {
  site: string; // Anatomical location
  onset: string; // Timing & nature of onset (sudden/gradual)
  character: string; // Sensation quality (crushing, burning, stabbing, dull ache)
  radiation: string; // Anatomical radiation (e.g., to left arm/jaw, or 'None')
  associations: string[]; // Accompanying autonomic/systemic symptoms (diaphoresis, nausea)
  timeCourse: string; // Constant, episodic, waxing-waning, progressive
  exacerbatingRelievingFactors: string; // Triggers, worsens with exertion, relieved by rest/meds
  severity: string; // Numerical (e.g. 8/10) or qualitative scale
  summaryNarrative: string; // Synthesized professional doctor-facing paragraph
}

export interface MedicationItem {
  name: string;
  dose?: string;
  frequency?: string;
  indication?: string;
  compliance?: 'Reported regular' | 'Irregular' | 'Non-compliant' | 'Discontinued' | 'Unknown';
}

export interface AllergyItem {
  allergen: string;
  reactionType?: string;
  isSevere: boolean;
}

export interface MedicalHistoryItem {
  condition: string;
  durationOrYear?: string;
  status?: string;
  notes?: string;
}

export interface SurgicalHistoryItem {
  procedure: string;
  approximateYear?: string;
  notes?: string;
}

export interface ReviewOfSystems {
  cardiovascular?: string[];
  respiratory?: string[];
  gastrointestinal?: string[];
  neurological?: string[];
  musculoskeletal?: string[];
  constitutional?: string[]; // Fever, weight loss, chills, fatigue
  genitourinary?: string[];
  integumentary?: string[];
  other?: string[];
}

export interface RedFlagAlert {
  symptom: string;
  clinicalConcern: string; // e.g. "Suspected Acute Coronary Syndrome (ACS)"
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  immediateTriageAction: string; // e.g. "Order immediate stat 12-lead ECG, Troponin, call attending"
}

export type ReconciliationType =
  | 'DRUG_DRUG_INTERACTION'
  | 'DRUG_ALLERGY_INTERACTION'
  | 'DRUG_DISEASE_CONTRAINDICATION'
  | 'DUPLICATIVE_THERAPY'
  | 'INDICATION_GAP';

export type ReconciliationSeverity = 'CONTRAINDICATED' | 'MAJOR' | 'MODERATE' | 'DUPLICATION';

export interface MedicationReconciliationIssue {
  id: string;
  type: ReconciliationType;
  severity: ReconciliationSeverity;
  drugsOrEntitiesInvolved: string[]; // e.g. ['Ibuprofen', 'Active Gastropathy / Peptic Ulcer'] or ['Apixaban', 'Aspirin']
  clinicalConcern: string; // Pharmacological & pathophysiology rationale
  physicianRecommendation: string; // Actionable recommendation for doctor review
  reviewed?: boolean;
  physicianOverrideNote?: string;
}

export interface MedicationReconciliationReport {
  overallRiskLevel: 'HIGH_RISK' | 'MODERATE_RISK' | 'LOW_RISK' | 'CLEAR';
  summary: string;
  totalConcernsCount: number;
  issues: MedicationReconciliationIssue[];
  reconciledTimestamp?: string;
}

export interface ClarificationQuestion {
  id: string;
  category: 'Duration' | 'Dosage' | 'Site/Character' | 'Associated Symptoms' | 'Red Flag Rule-out' | 'Other';
  question: string;
  rationale: string;
  userAnswer?: string;
}

export interface ClinicalIntakeRecord {
  id: string;
  timestamp: string;
  patientMeta: {
    nameOrId: string;
    estimatedAgeGender?: string;
    identifiedLanguage?: string;
    triageLevel: TriageLevel;
    triageReason: string;
    redactedIdentifiers: string[];
    rawInputCleaned: string;
  };
  chiefComplaint: {
    complaint: string;
    duration: string;
    urgencyTier: 'Critical' | 'Urgent' | 'Standard';
  };
  socratesHpi: SocratesHPI;
  pastHistory: {
    medicalConditions: MedicalHistoryItem[];
    surgicalHistory: SurgicalHistoryItem[];
  };
  medications: MedicationItem[];
  allergies: AllergyItem[];
  medicationReconciliation?: MedicationReconciliationReport;
  familyPersonalHistory: {
    familyHistory: string[];
    socialPersonal: {
      tobaccoAlcohol?: string;
      occupationLifestyle?: string;
      dietActivity?: string;
    };
  };
  reviewOfSystems: ReviewOfSystems;
  redFlags: RedFlagAlert[];
  clarificationQuestions: ClarificationQuestion[];
  physicianNoteDraft: {
    subjective: string;
    pertinentNegatives: string[];
    clinicalImpressionContext: string; // Intake-only context, strictly not a diagnosis
  };
}

export interface IntakePresetScenario {
  id: string;
  title: string;
  specialty: string;
  badge: 'Red Flag' | 'Urgent' | 'Multilingual' | 'Complex HPI';
  summary: string;
  transcript: string;
}
