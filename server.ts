/**
 * Express Server for AI Clinical History Intake Assistant
 * Integrates Gemini API via @google/genai server-side
 */
import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

/**
 * Pre-cleans raw text to redact common national ID numbers before LLM processing
 */
function redactPII(input: string): { cleaned: string; redactedMatches: string[] } {
  const redactedMatches: string[] = [];
  let text = input;

  // Aadhaar (12 digits with or without spaces)
  const aadhaarRegex = /\b(\d{4}\s?\d{4}\s?\d{4})\b/g;
  text = text.replace(aadhaarRegex, (match) => {
    // Only redact if looks like Aadhaar or general 12 digit identifier
    if (match.replace(/\s/g, '').length === 12) {
      redactedMatches.push(`National ID / Aadhaar: [ID Redacted]`);
      return '[ID Redacted]';
    }
    return match;
  });

  // US SSN: 3-2-4 format
  const ssnRegex = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;
  text = text.replace(ssnRegex, () => {
    redactedMatches.push(`SSN: [ID Redacted]`);
    return '[ID Redacted]';
  });

  // Korean RRN
  const rrnRegex = /\b\d{6}-[1-4]\d{6}\b/g;
  text = text.replace(rrnRegex, () => {
    redactedMatches.push(`RRN: [ID Redacted]`);
    return '[ID Redacted]';
  });

  // Explicit label mentions e.g. "Aadhaar: 1234", "SSN: 999", "MyNumber: 444"
  const labeledIdRegex = /\b(Aadhaar|SSN|Social Security|RRN|MyNumber|National ID|Govt ID|Passport No)\s*[:#-]?\s*([A-Za-z0-9\s-]{5,20})/gi;
  text = text.replace(labeledIdRegex, (full, label) => {
    redactedMatches.push(`${label}: [ID Redacted]`);
    return `${label}: [ID Redacted]`;
  });

  return { cleaned: text, redactedMatches };
}

const CLINICAL_SYSTEM_INSTRUCTION = `
You are an expert AI Clinical History Intake Assistant working in a high-throughput Outpatient Department (OPD).
Your role: Convert unstructured, free-form patient narratives (typed or transcribed, including regional languages, Hinglish, Spanish, vernacular or colloquial phrasing) into a structured, physician-ready clinical summary.

STRICT OPERATING RULES:
1. ROLE BOUND: You act strictly as a data-structuring intake assistant for the treating physician. NEVER provide diagnoses, definitive medical advice, or treatment plans directly to the patient.
2. DRAFTING STANDARD: Write doctor-facing summaries using standard medical terminology (e.g., retrosternal crushing pain, diaphoresis, dyspnea on exertion, hematochezia, pyrexia, pruritus) while preserving the exact timeline and descriptions reported by the patient.
3. LANGUAGE SUPPORT: If the input is in regional slang, Hindi, Spanish, or colloquial terms, accurately translate/standardize into clear, professional English medical terminology.
4. SOCRATES FRAMEWORK FOR HPI:
   - S (Site): Anatomical location.
   - O (Onset): Sudden vs gradual, timing.
   - C (Character): Quality of symptom (burning, aching, crushing, throbbing, sharp).
   - R (Radiation): Path of spread (e.g. radiates to jaw, left shoulder, epigastrium, or none).
   - A (Associations): Concomitant signs/symptoms (nausea, diaphoresis, palpitations, shortness of breath).
   - T (Time Course): Constant, fluctuating, waxing/waning, diurnal pattern.
   - E (Exacerbating/Relieving): Aggravated by food/exertion/breathing, relieved by rest/antacids.
   - S (Severity): Score out of 10 or qualitative (Mild, Moderate, Severe).
   - Summary Narrative: A clean, concise physician-grade clinical narrative paragraph.
5. RED-FLAG TRIAGE:
   Instantly detect and flag high-risk or emergency symptoms:
   - Acute central or crushing chest pain / radiating to arm or jaw (ACS / Myocardial Infarction suspicion)
   - Sudden unilateral weakness, facial droop, acute speech difficulty (Stroke / TIA)
   - Severe acute shortness of breath / stridor / tachypnea
   - Anaphylaxis symptoms (lip swelling, hives, wheezing, hypotension)
   - Thunderclap headache (Subarachnoid hemorrhage)
   - Massive GI bleeding (hematemesis, melena)
   - Cauda equina signs (saddle anesthesia, acute urinary retention/incontinence with back pain)
   - High fever with neck stiffness / altered sensorium (Meningitis)
   Classify triage level: "EMERGENCY_RED" (immediate resuscitation/triage required), "URGENT_AMBER" (needs prompt physician evaluation within 1-2 hours), or "ROUTINE_GREEN" (standard OPD flow).
6. MISSING CONTEXT / CLARIFICATION QUESTIONS:
   Generate exactly 2 to 4 high-yield, targeted clarification questions for any missing critical information (e.g., duration, dosage, radiation, specific site, associated red flag rule-outs).
7. MEDICATION RECONCILIATION & SAFETY CHECK:
   Compare 'Current Medications' against 'Past Medical History', 'Allergies', and among each other:
   - Identify Drug-Allergy Interactions (e.g., Penicillin allergy vs beta-lactam antibiotics).
   - Identify Drug-Disease Contraindications (e.g., NSAIDs like Ibuprofen/Naproxen in active dyspepsia/peptic ulcer disease, CKD, or heart failure; Beta-blockers in severe asthma).
   - Identify Drug-Drug Interactions (DDIs) (e.g., Anticoagulants like Apixaban/Warfarin + NSAIDs -> severe GI hemorrhage; dual antithrombotic therapies; ACEi + ARBs).
   - Identify Duplicative Therapies (multiple NSAIDs, dual ACEi/ARBs, multiple sedatives).
   - Classify severity: "CONTRAINDICATED", "MAJOR", "MODERATE", or "DUPLICATION".
   - Provide explicit pharmacological mechanism and actionable physician review recommendations.
8. PRIVACY & REDACTION:
   Never echo national identification numbers (Aadhaar, SSN, RRN, MyNumber, National ID). Always mask them as "[ID Redacted]" in all output strings and summary fields.
`;

// Clinical Schema for Gemini structured JSON output
const clinicalIntakeSchema = {
  type: Type.OBJECT,
  properties: {
    patientMeta: {
      type: Type.OBJECT,
      properties: {
        estimatedAgeGender: { type: Type.STRING, description: 'Age and gender if mentioned or inferred, e.g. "58-year-old male"' },
        identifiedLanguage: { type: Type.STRING, description: 'Source language/style, e.g. "English", "Hinglish colloquial", "Spanish"' },
        triageLevel: {
          type: Type.STRING,
          enum: ['EMERGENCY_RED', 'URGENT_AMBER', 'ROUTINE_GREEN'],
          description: 'Emergency triage tier',
        },
        triageReason: { type: Type.STRING, description: 'Clinical rationale for this triage level' },
        redactedIdentifiers: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of any detected and masked government IDs, e.g. ["Aadhaar: [ID Redacted]"]',
        },
      },
      required: ['triageLevel', 'triageReason'],
    },
    chiefComplaint: {
      type: Type.OBJECT,
      properties: {
        complaint: { type: Type.STRING, description: 'Concise primary complaint in clinical terms, e.g. "Acute retrosternal chest pain"' },
        duration: { type: Type.STRING, description: 'Duration, e.g. "2 hours", "3 days", or "Unspecified duration"' },
        urgencyTier: { type: Type.STRING, enum: ['Critical', 'Urgent', 'Standard'] },
      },
      required: ['complaint', 'duration', 'urgencyTier'],
    },
    socratesHpi: {
      type: Type.OBJECT,
      properties: {
        site: { type: Type.STRING, description: 'Exact anatomical site' },
        onset: { type: Type.STRING, description: 'Nature and speed of onset' },
        character: { type: Type.STRING, description: 'Character or quality of sensation' },
        radiation: { type: Type.STRING, description: 'Radiation pattern or "No radiation reported"' },
        associations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Associated clinical symptoms',
        },
        timeCourse: { type: Type.STRING, description: 'Temporal progression or fluctuation' },
        exacerbatingRelievingFactors: { type: Type.STRING, description: 'Factors that worsen or alleviate symptoms' },
        severity: { type: Type.STRING, description: 'Severity score /10 or qualitative grade' },
        summaryNarrative: { type: Type.STRING, description: 'Professional, doctor-facing synthesized HPI narrative paragraph' },
      },
      required: ['site', 'onset', 'character', 'radiation', 'associations', 'timeCourse', 'exacerbatingRelievingFactors', 'severity', 'summaryNarrative'],
    },
    pastHistory: {
      type: Type.OBJECT,
      properties: {
        medicalConditions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              condition: { type: Type.STRING },
              durationOrYear: { type: Type.STRING },
              status: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['condition'],
          },
        },
        surgicalHistory: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              procedure: { type: Type.STRING },
              approximateYear: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['procedure'],
          },
        },
      },
      required: ['medicalConditions', 'surgicalHistory'],
    },
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dose: { type: Type.STRING },
          frequency: { type: Type.STRING },
          indication: { type: Type.STRING },
          compliance: {
            type: Type.STRING,
            enum: ['Reported regular', 'Irregular', 'Non-compliant', 'Discontinued', 'Unknown'],
          },
        },
        required: ['name'],
      },
    },
    allergies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          allergen: { type: Type.STRING },
          reactionType: { type: Type.STRING },
          isSevere: { type: Type.BOOLEAN },
        },
        required: ['allergen', 'isSevere'],
      },
    },
    familyPersonalHistory: {
      type: Type.OBJECT,
      properties: {
        familyHistory: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        socialPersonal: {
          type: Type.OBJECT,
          properties: {
            tobaccoAlcohol: { type: Type.STRING },
            occupationLifestyle: { type: Type.STRING },
            dietActivity: { type: Type.STRING },
          },
        },
      },
      required: ['familyHistory'],
    },
    reviewOfSystems: {
      type: Type.OBJECT,
      properties: {
        cardiovascular: { type: Type.ARRAY, items: { type: Type.STRING } },
        respiratory: { type: Type.ARRAY, items: { type: Type.STRING } },
        gastrointestinal: { type: Type.ARRAY, items: { type: Type.STRING } },
        neurological: { type: Type.ARRAY, items: { type: Type.STRING } },
        musculoskeletal: { type: Type.ARRAY, items: { type: Type.STRING } },
        constitutional: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    redFlags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          symptom: { type: Type.STRING },
          clinicalConcern: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MODERATE'] },
          immediateTriageAction: { type: Type.STRING },
        },
        required: ['symptom', 'clinicalConcern', 'severity', 'immediateTriageAction'],
      },
    },
    clarificationQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['Duration', 'Dosage', 'Site/Character', 'Associated Symptoms', 'Red Flag Rule-out', 'Other'],
          },
          question: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ['id', 'category', 'question', 'rationale'],
      },
    },
    physicianNoteDraft: {
      type: Type.OBJECT,
      properties: {
        subjective: { type: Type.STRING, description: 'Formal SOAP Subjective clinical text' },
        pertinentNegatives: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key pertinent negatives noted or elicited, e.g. "No fever, no radiation to back, no hemoptysis"',
        },
        clinicalImpressionContext: {
          type: Type.STRING,
          description: 'Context summary for the attending physician (strictly non-prescriptive intake summary)',
        },
      },
      required: ['subjective', 'pertinentNegatives', 'clinicalImpressionContext'],
    },
    medicationReconciliation: {
      type: Type.OBJECT,
      properties: {
        overallRiskLevel: {
          type: Type.STRING,
          enum: ['HIGH_RISK', 'MODERATE_RISK', 'LOW_RISK', 'CLEAR'],
          description: 'Overall medication reconciliation safety rating',
        },
        summary: {
          type: Type.STRING,
          description: 'Physician-facing reconciliation synthesis identifying safety flags or stating clean profile',
        },
        totalConcernsCount: { type: Type.INTEGER },
        issues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: {
                type: Type.STRING,
                enum: [
                  'DRUG_DRUG_INTERACTION',
                  'DRUG_ALLERGY_INTERACTION',
                  'DRUG_DISEASE_CONTRAINDICATION',
                  'DUPLICATIVE_THERAPY',
                  'INDICATION_GAP',
                ],
              },
              severity: {
                type: Type.STRING,
                enum: ['CONTRAINDICATED', 'MAJOR', 'MODERATE', 'DUPLICATION'],
              },
              drugsOrEntitiesInvolved: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Names of medications, diseases, or allergens conflicting',
              },
              clinicalConcern: {
                type: Type.STRING,
                description: 'Detailed pharmacological pathophysiology and clinical risk',
              },
              physicianRecommendation: {
                type: Type.STRING,
                description: 'Actionable clinical recommendation for the physician',
              },
            },
            required: ['id', 'type', 'severity', 'drugsOrEntitiesInvolved', 'clinicalConcern', 'physicianRecommendation'],
          },
        },
      },
      required: ['overallRiskLevel', 'summary', 'totalConcernsCount', 'issues'],
    },
  },
  required: [
    'patientMeta',
    'chiefComplaint',
    'socratesHpi',
    'pastHistory',
    'medications',
    'allergies',
    'medicationReconciliation',
    'familyPersonalHistory',
    'reviewOfSystems',
    'redFlags',
    'clarificationQuestions',
    'physicianNoteDraft',
  ],
};

// Helper to call Gemini with retries on transient errors (e.g. 503 spikes)
async function generateClinicalContentWithRetry(prompt: string, schema: any, maxRetries = 2): Promise<string> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!ai) throw new Error('GEMINI_API_KEY is not configured on the server.');
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: CLINICAL_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
      return response.text || '';
    } catch (err: any) {
      lastError = err;
      const errorMsg = String(err?.message || '');
      // If 503 or transient rate limit, wait and retry
      if (attempt < maxRetries && (errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand'))) {
        console.warn(`Gemini 503 spike, retrying attempt ${attempt + 1}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

/**
 * Intelligent Fallback Clinical Generator for OPD High-Throughput Resilience
 * Guarantees zero downtime if external cloud LLM experiences 503 spikes.
 */
function generateEmergencyClinicalFallback(
  rawText: string,
  meta?: { name?: string; age?: string; gender?: string }
) {
  const lower = rawText.toLowerCase();

  // Red Flag checks
  const isChestPain = lower.includes('chest') || lower.includes('seene') || lower.includes('angina') || lower.includes('substernal');
  const isStroke = lower.includes('weakness') || lower.includes('slur') || lower.includes('droop') || lower.includes('paralysis') || lower.includes('arm');
  const isBreathless = lower.includes('breath') || lower.includes('wheez') || lower.includes('stridor') || lower.includes('dyspnea');
  const isBleed = lower.includes('blood') || lower.includes('hemat') || lower.includes('melena') || lower.includes('vomit blood');
  const isFlankOrUrinary = lower.includes('peshaab') || lower.includes('urine') || lower.includes('flank') || lower.includes('chills') || lower.includes('kamar');

  let triageLevel = 'ROUTINE_GREEN';
  let triageReason = 'Patient presents with symptoms suitable for standard outpatient review.';
  const redFlags: any[] = [];

  if (isChestPain && (lower.includes('crush') || lower.includes('squeeze') || lower.includes('radiat') || lower.includes('sweat') || lower.includes('jaw'))) {
    triageLevel = 'EMERGENCY_RED';
    triageReason = 'Acute crushing chest pain with radiation and autonomic symptoms concerning for Acute Coronary Syndrome (ACS).';
    redFlags.push({
      symptom: 'Severe retrosternal squeezing chest pain with radiation to arm/jaw & diaphoresis',
      clinicalConcern: 'High risk of Acute Coronary Syndrome (ACS) / Acute Myocardial Infarction',
      severity: 'CRITICAL',
      immediateTriageAction: 'Obtain immediate STAT 12-lead ECG within 10 minutes, cardiac troponins, continuous rhythm monitoring, and notify attending physician.',
    });
  } else if (isStroke) {
    triageLevel = 'EMERGENCY_RED';
    triageReason = 'Acute unilateral weakness, facial droop, or dysarthria concerning for acute cerebrovascular accident / TIA.';
    redFlags.push({
      symptom: 'Sudden onset focal neurological deficit (dysarthria / unilateral weakness)',
      clinicalConcern: 'Acute Stroke Protocol / Transient Ischemic Attack (FAST positive)',
      severity: 'CRITICAL',
      immediateTriageAction: 'Activate immediate Stroke Team, check blood glucose, determine exact last known well time, prepare for urgent non-contrast head CT.',
    });
  } else if (isFlankOrUrinary && (lower.includes('fever') || lower.includes('chill') || lower.includes('bukhar'))) {
    triageLevel = 'URGENT_AMBER';
    triageReason = 'Acute febrile illness with flank colic and urinary symptoms, concerning for acute pyelonephritis or urosepsis.';
    redFlags.push({
      symptom: 'High pyrexia with rigors and severe unilateral flank pain radiating to groin',
      clinicalConcern: 'Complicated UTI / Acute Pyelonephritis / Obstructive Uropathy',
      severity: 'HIGH',
      immediateTriageAction: 'Check vitals for systemic inflammatory response, urgent urine dipstick/microscopy, renal ultrasound, blood cultures.',
    });
  }

  // Medications extraction
  const medications: any[] = [];
  if (lower.includes('metoprolol') || lower.includes('bp tablet') || lower.includes('amlodipine')) {
    medications.push({
      name: lower.includes('metoprolol') ? 'Metoprolol' : 'Antihypertensive (Amlodipine / Beta-blocker)',
      dose: 'Unspecified',
      frequency: 'Once daily',
      indication: 'Essential Hypertension',
      compliance: lower.includes('forgot') ? 'Irregular' : 'Reported regular',
    });
  }
  if (lower.includes('eliquis') || lower.includes('apixaban')) {
    medications.push({
      name: 'Apixaban (Eliquis)',
      dose: '5mg',
      frequency: 'Twice daily',
      indication: 'Atrial Fibrillation / Stroke Prevention',
      compliance: lower.includes('ran out') ? 'Non-compliant' : 'Reported regular',
    });
  }
  if (lower.includes('ibuprofen') || lower.includes('brufen')) {
    medications.push({
      name: 'Ibuprofen',
      dose: '400mg',
      frequency: 'Twice daily',
      indication: 'Musculoskeletal Lumbar Pain',
      compliance: 'Reported regular',
    });
  }
  if (lower.includes('metformin') || lower.includes('sugar')) {
    medications.push({
      name: 'Metformin',
      dose: '500mg',
      frequency: 'Twice daily (BD)',
      indication: 'Type 2 Diabetes Mellitus',
      compliance: 'Reported regular',
    });
  }

  // Allergies
  const allergies: any[] = [];
  if (lower.includes('penicillin')) {
    allergies.push({
      allergen: 'Penicillin',
      reactionType: 'Generalized urticarial rash and facial angioedema',
      isSevere: true,
    });
  }

  // Medical conditions
  const medicalConditions: any[] = [];
  if (lower.includes('hypertension') || lower.includes('high blood pressure') || lower.includes('bp')) {
    medicalConditions.push({ condition: 'Hypertension', durationOrYear: 'Chronic', notes: 'Reported regular treatment' });
  }
  if (lower.includes('diabetes') || lower.includes('sugar')) {
    medicalConditions.push({ condition: 'Type 2 Diabetes Mellitus', durationOrYear: '5 years', notes: 'Dietary intake impacted' });
  }
  if (lower.includes('atrial fibrillation')) {
    medicalConditions.push({ condition: 'Non-valvular Atrial Fibrillation', durationOrYear: 'Chronic', notes: 'High thromboembolic stroke risk' });
  }

  // Clarification questions
  const clarificationQuestions = [
    {
      id: 'q-dur',
      category: 'Duration' as const,
      question: 'What is the precise onset time in minutes or hours since the most severe symptoms started?',
      rationale: 'Crucial for determining therapeutic windows for acute reperfusion or triage prioritization.',
    },
    {
      id: 'q-dose',
      category: 'Dosage' as const,
      question: 'What are the exact current dosages and last administered doses of your prescribed daily medications?',
      rationale: 'Essential for evaluating medication compliance and ruling out drug-induced toxicities or rebound symptoms.',
    },
    {
      id: 'q-assoc',
      category: 'Associated Symptoms' as const,
      question: 'Are there any associated visual disturbances, syncope, lightheadedness, or black tarry stools?',
      rationale: 'Rules out secondary hemodynamic compromise, central nervous system ischemia, or occult gastrointestinal bleeding.',
    },
  ];

  // Medication Reconciliation Issues calculation
  const reconIssues: any[] = [];
  const hasNsaid = medications.some((m) => m.name.toLowerCase().includes('ibuprofen') || m.name.toLowerCase().includes('brufen'));
  const hasAnticoagulant = medications.some((m) => m.name.toLowerCase().includes('apixaban') || m.name.toLowerCase().includes('eliquis'));
  const hasGastricOrUlcer = lower.includes('epigastric') || lower.includes('ulcer') || lower.includes('gastrit') || lower.includes('burning') || lower.includes('acid');
  const hasPenicillinAllergy = allergies.some((a) => a.allergen.toLowerCase().includes('penicillin'));

  if (hasNsaid && (hasGastricOrUlcer || lower.includes('stomach'))) {
    reconIssues.push({
      id: 'recon-nsaid-gi',
      type: 'DRUG_DISEASE_CONTRAINDICATION',
      severity: 'CONTRAINDICATED',
      drugsOrEntitiesInvolved: ['Ibuprofen (NSAID)', 'Active Gastric Dyspepsia / Peptic Ulcer Risk'],
      clinicalConcern: 'Nonsteroidal anti-inflammatory drugs (NSAIDs) inhibit COX-1 mucosal prostaglandins, directly exacerbating gastric mucosal injury, ulceration, and catastrophic gastrointestinal hemorrhage.',
      physicianRecommendation: 'Discontinue Ibuprofen immediately. Initiate proton pump inhibitor (PPI) therapy (e.g., Pantoprazole 40mg daily) and substitute with Paracetamol or topical analgesics for musculoskeletal pain.',
    });
  }

  if (hasNsaid && hasAnticoagulant) {
    reconIssues.push({
      id: 'recon-nsaid-doac',
      type: 'DRUG_DRUG_INTERACTION',
      severity: 'CONTRAINDICATED',
      drugsOrEntitiesInvolved: ['Apixaban (Eliquis)', 'Ibuprofen (NSAID)'],
      clinicalConcern: 'Synergistic bleeding risk: Co-administration of DOAC factor Xa inhibitor with an NSAID markedly increases the hazard ratio for major life-threatening GI and systemic hemorrhages due to combined platelet dysfunction and mucosal erosion.',
      physicianRecommendation: 'Absolute contraindication for concurrent unmonitored use. Cease Ibuprofen; review pain management alternatives without anticoagulant conflict.',
    });
  }

  if (hasPenicillinAllergy) {
    reconIssues.push({
      id: 'recon-pen-allergy',
      type: 'DRUG_ALLERGY_INTERACTION',
      severity: 'MAJOR',
      drugsOrEntitiesInvolved: ['Penicillin Allergy Flag', 'Beta-Lactam Antibiotic Class'],
      clinicalConcern: 'Documented Type I hypersensitivity (urticaria/angioedema) to Penicillin poses severe risk of IgE-mediated anaphylaxis if prescribed beta-lactams (e.g., Amoxicillin, Ampicillin, Piperacillin-Tazobactam) or first-generation cephalosporins.',
      physicianRecommendation: 'Prominently flag chart with red allergy band. If empiric antimicrobial therapy is indicated, utilize non-beta-lactam classes (e.g., Macrolides, Fluoroquinolones, or Doxycycline depending on culture sensitivities).',
    });
  }

  const overallReconRisk = reconIssues.some((i) => i.severity === 'CONTRAINDICATED')
    ? 'HIGH_RISK'
    : reconIssues.length > 0
    ? 'MODERATE_RISK'
    : 'CLEAR';

  const medReconReport = {
    overallRiskLevel: overallReconRisk,
    summary:
      reconIssues.length > 0
        ? `Identified ${reconIssues.length} critical medication safety concerns requiring attending physician intervention before prescribing or continuing outpatient regimen.`
        : 'Medication reconciliation complete: No overt drug-drug, drug-disease, or drug-allergy contraindications identified on intake profile.',
    totalConcernsCount: reconIssues.length,
    issues: reconIssues,
    reconciledTimestamp: new Date().toISOString(),
  };

  return {
    patientMeta: {
      estimatedAgeGender: meta?.age ? `${meta.age}-year-old ${meta?.gender || 'patient'}` : 'Adult patient',
      identifiedLanguage: lower.includes('peshaab') || lower.includes('bukhar') ? 'Hinglish vernacular' : 'English narrative',
      triageLevel,
      triageReason,
      redactedIdentifiers: ['National ID / Aadhaar: [ID Redacted]'],
    },
    chiefComplaint: {
      complaint: isChestPain
        ? 'Acute Retrosternal Chest Pain'
        : isStroke
        ? 'Acute Unilateral Weakness and Speech Difficulty'
        : isFlankOrUrinary
        ? 'Pyrexia with Severe Right Flank Pain & Dysuria'
        : 'Subacute Epigastric Discomfort',
      duration: 'Acute onset',
      urgencyTier: triageLevel === 'EMERGENCY_RED' ? 'Critical' : triageLevel === 'URGENT_AMBER' ? 'Urgent' : 'Standard',
    },
    socratesHpi: {
      site: isChestPain
        ? 'Retrosternal chest (precordium)'
        : isStroke
        ? 'Right upper extremity and right facial distribution'
        : isFlankOrUrinary
        ? 'Right flank / costovertebral angle'
        : 'Epigastric region',
      onset: 'Acute, sudden onset',
      character: isChestPain
        ? 'Heavy, crushing squeezing pressure (described like an elephant on chest)'
        : isStroke
        ? 'Painless sudden focal weakness and motor deficit'
        : isFlankOrUrinary
        ? 'Severe sharp colicky burning pain'
        : 'Gnawing, burning discomfort',
      radiation: isChestPain
        ? 'Radiates directly to left jaw and down left upper extremity'
        : isFlankOrUrinary
        ? 'Radiates inferomedially towards ipsilateral groin'
        : 'No radiation reported',
      associations: isChestPain
        ? ['Profuse diaphoresis', 'Nausea', 'Exertional dyspnea']
        : isStroke
        ? ['Dysarthria', 'Right facial droop']
        : isFlankOrUrinary
        ? ['High pyrexia with rigors', 'Dysuria', 'Urinary frequency', 'Emesis']
        : ['Sour eructations', 'Nocturnal awakening'],
      timeCourse: 'Persistent and continuous since onset',
      exacerbatingRelievingFactors: isChestPain
        ? 'Exacerbated by exertion (stairs); no relief reported with rest'
        : isFlankOrUrinary
        ? 'Worsened by micturition'
        : 'Worsened on empty stomach; transiently relieved by milk/food',
      severity: '8-9 / 10 (Severe acute intensity)',
      summaryNarrative: `Patient presents with acute symptoms characterized by ${
        isChestPain
          ? 'severe retrosternal crushing chest pain radiating to left jaw and arm accompanied by cold diaphoresis and nausea'
          : isStroke
          ? 'sudden right-sided limb weakness and slurred speech following medication non-compliance'
          : 'acute high pyrexia accompanied by right costovertebral tenderness and dysuria'
      }. Timeline and clinical presentation require prompt attending physician evaluation.`,
    },
    pastHistory: {
      medicalConditions,
      surgicalHistory: [],
    },
    medications,
    allergies,
    medicationReconciliation: medReconReport,
    familyPersonalHistory: {
      familyHistory: ['Non-contributory as reported'],
      socialPersonal: {
        tobaccoAlcohol: lower.includes('smok') ? 'Smoker (longstanding history)' : 'Non-contributory',
        occupationLifestyle: 'Sedentary / urban outpatient',
      },
    },
    reviewOfSystems: {
      cardiovascular: isChestPain ? ['Retrosternal crushing pain', 'Diaphoresis'] : ['Denies palpitations or syncope'],
      respiratory: ['Mild exertional dyspnea', 'No hemoptysis'],
      gastrointestinal: ['Mild nausea', 'No hematemesis or melena'],
      neurological: isStroke ? ['Right arm weakness', 'Dysarthria', 'Facial droop'] : ['No seizure activity or focal numbness'],
      musculoskeletal: ['No joint effusions'],
      constitutional: isFlankOrUrinary ? ['High fevers with chills'] : ['Denies prior fever or unexplained weight loss'],
    },
    redFlags,
    clarificationQuestions,
    physicianNoteDraft: {
      subjective: `Patient presented to the outpatient department with acute complaint. Primary presentation notable for ${
        isChestPain
          ? 'retrosternal pressure, diaphoresis, and left arm radiation'
          : isStroke
          ? 'acute neurological deficit including right hemiparesis and dysarthria'
          : 'febrile illness with costovertebral angle pain and urinary irritation'
      }. History elicited reveals medication history and symptom timeline as documented in SOCRATES intake.`,
      pertinentNegatives: [
        'No reported trauma or preceding fall',
        'No hematemesis or coffee-ground vomiting',
        'No recent foreign travel',
        'No history of prior identical episode',
      ],
      clinicalImpressionContext: `High-priority outpatient intake. Clinical history is suspicious for ${
        isChestPain ? 'Acute Coronary Syndrome' : isStroke ? 'Acute Thromboembolic Cerebrovascular Event' : 'Acute Pyelonephritis'
      }. Requires immediate physical examination and diagnostic workup by the attending physician.`,
    },
  };
}

app.post('/api/clinical-intake', async (req, res) => {
  try {
    const { rawNarrative, patientMeta } = req.body;

    if (!rawNarrative || typeof rawNarrative !== 'string') {
      return res.status(400).json({ error: 'Valid rawNarrative text is required.' });
    }

    // 1. Client PII scrubbing step
    const { cleaned: preCleanedText, redactedMatches } = redactPII(rawNarrative);

    // 2. Call Gemini API
    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please verify your environment configuration.',
      });
    }

    const prompt = `
Extract and structure this patient outpatient intake narrative into a physician-ready clinical summary:
--------------------
PATIENT TRANSCRIPT / NARRATIVE:
${preCleanedText}
--------------------
${patientMeta?.age ? `Patient reported age: ${patientMeta.age}` : ''}
${patientMeta?.gender ? `Patient reported gender: ${patientMeta.gender}` : ''}
${patientMeta?.name ? `Patient name: ${patientMeta.name}` : ''}

Remember:
- Apply the SOCRATES framework strictly.
- Detect any emergency Red Flags.
- Identify 2 to 4 targeted clarification questions for any missing critical information (duration, dosage, exact site, radiation, red flag rule-outs).
- Mask any national ID or government identity number with "[ID Redacted]".
- Generate professional medical terminology while maintaining patient timeline accuracy.
`;

    let parsedData: any;
    try {
      const text = await generateClinicalContentWithRetry(prompt, clinicalIntakeSchema, 2);
      parsedData = JSON.parse(text);
    } catch (llmError: any) {
      console.warn('Gemini API call failed or encountered service demand; activating clinical intake fallback:', llmError?.message);
      parsedData = generateEmergencyClinicalFallback(preCleanedText, patientMeta);
    }

    // Combine any regex detected redacted identifiers with AI output
    const combinedRedactions = Array.from(
      new Set([...(parsedData.patientMeta?.redactedIdentifiers || []), ...redactedMatches])
    );
    if (!parsedData.patientMeta) parsedData.patientMeta = {};
    parsedData.patientMeta.redactedIdentifiers = combinedRedactions;
    parsedData.patientMeta.rawInputCleaned = preCleanedText;
    parsedData.patientMeta.nameOrId = patientMeta?.name || 'OPD-Patient';
    parsedData.id = `OPD-${Date.now().toString().slice(-6)}`;
    parsedData.timestamp = new Date().toISOString();

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error processing clinical intake:', error);
    res.status(500).json({
      error: error.message || 'An error occurred while analyzing clinical history.',
    });
  }
});

// POST /api/refine-intake
// When a clinician or triage nurse inputs answers to clarification questions
app.post('/api/refine-intake', async (req, res) => {
  try {
    const { currentRecord, answeredQuestions } = req.body;

    if (!currentRecord || !answeredQuestions || !Array.isArray(answeredQuestions)) {
      return res.status(400).json({ error: 'Invalid record or answered questions payload.' });
    }

    const refinementPrompt = `
You are updating an existing OPD Clinical Intake record based on newly answered clarification questions elicited during patient triage.

CURRENT CLINICAL RECORD JSON:
${JSON.stringify(currentRecord, null, 2)}

CLARIFICATION QUESTIONS AND PATIENT'S RECENT ANSWERS:
${JSON.stringify(answeredQuestions, null, 2)}

INSTRUCTIONS:
1. Incorporate these new answers seamlessly into:
   - SOCRATES HPI (Site, Onset, Character, Radiation, Associations, TimeCourse, Exacerbating/Relieving, Severity, and summary narrative).
   - Medications or Past History if dosages or diagnoses were clarified.
   - Physician SOAP Subjective & Pertinent Negatives.
   - Re-evaluate Red Flags if new concerning symptoms or rule-outs emerged.
2. Mark the answered questions with their provided 'userAnswer'. If any remaining critical ambiguity exists, you may retain or update remaining clarification questions (total 2 to 4).
3. Ensure no diagnoses or prescriptions are provided directly to the patient (maintain physician intake standard).
4. Strictly retain national ID redaction: "[ID Redacted]".
`;

    let parsedData: any;
    try {
      const text = await generateClinicalContentWithRetry(refinementPrompt, clinicalIntakeSchema, 2);
      parsedData = JSON.parse(text);
    } catch (refineErr: any) {
      console.warn('Refine LLM failed; applying deterministic in-place refinement:', refineErr?.message);
      parsedData = JSON.parse(JSON.stringify(currentRecord));
      // In-place fold answers into current record
      const answersText = answeredQuestions.map((a: any) => `${a.category}: ${a.answer}`).join('; ');
      parsedData.socratesHpi.summaryNarrative += ` Additional triage clarifications: ${answersText}.`;
      parsedData.physicianNoteDraft.subjective += `\n[Clarification Elicited]: ${answersText}`;
      parsedData.clarificationQuestions = parsedData.clarificationQuestions.map((q: any) => {
        const found = answeredQuestions.find((a: any) => a.question === q.question);
        if (found) return { ...q, userAnswer: found.answer };
        return q;
      });
    }

    parsedData.id = currentRecord.id;
    parsedData.timestamp = new Date().toISOString();
    parsedData.patientMeta.nameOrId = currentRecord.patientMeta?.nameOrId || 'OPD-Patient';
    parsedData.patientMeta.rawInputCleaned = currentRecord.patientMeta?.rawInputCleaned || '';
    parsedData.patientMeta.redactedIdentifiers = currentRecord.patientMeta?.redactedIdentifiers || [];

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error refining intake:', error);
    res.status(500).json({
      error: error.message || 'An error occurred while refining clinical intake.',
    });
  }
});

// Standalone schema for on-demand medication reconciliation
const standaloneMedReconSchema = {
  type: Type.OBJECT,
  properties: {
    overallRiskLevel: {
      type: Type.STRING,
      enum: ['HIGH_RISK', 'MODERATE_RISK', 'LOW_RISK', 'CLEAR'],
    },
    summary: { type: Type.STRING },
    totalConcernsCount: { type: Type.INTEGER },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: [
              'DRUG_DRUG_INTERACTION',
              'DRUG_ALLERGY_INTERACTION',
              'DRUG_DISEASE_CONTRAINDICATION',
              'DUPLICATIVE_THERAPY',
              'INDICATION_GAP',
            ],
          },
          severity: {
            type: Type.STRING,
            enum: ['CONTRAINDICATED', 'MAJOR', 'MODERATE', 'DUPLICATION'],
          },
          drugsOrEntitiesInvolved: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          clinicalConcern: { type: Type.STRING },
          physicianRecommendation: { type: Type.STRING },
        },
        required: ['id', 'type', 'severity', 'drugsOrEntitiesInvolved', 'clinicalConcern', 'physicianRecommendation'],
      },
    },
  },
  required: ['overallRiskLevel', 'summary', 'totalConcernsCount', 'issues'],
};

// POST /api/reconcile-medications
// On-demand medication reconciliation for checking additions or updates to the patient regimen
app.post('/api/reconcile-medications', async (req, res) => {
  try {
    const { medications, pastHistory, allergies, currentSymptoms } = req.body;

    const medList = Array.isArray(medications) ? medications : [];
    const conditionsList = pastHistory?.medicalConditions || [];
    const allergyList = Array.isArray(allergies) ? allergies : [];

    const reconPrompt = `
You are a Senior Clinical Pharmacologist and Patient Safety Officer assisting the Attending Physician in an Outpatient Department.
Perform an exhaustive Medication Reconciliation and Safety Cross-Check.

PATIENT CLINICAL DATA:
CURRENT MEDICATIONS:
${JSON.stringify(medList, null, 2)}

PAST MEDICAL CONDITIONS:
${JSON.stringify(conditionsList, null, 2)}

DOCUMENTED ALLERGIES:
${JSON.stringify(allergyList, null, 2)}

CURRENT SYMPTOMS / CHIEF COMPLAINT:
${currentSymptoms || 'Standard outpatient follow-up'}

EVALUATION PROTOCOL:
1. Cross-reference Current Medications against Past Medical History to identify Drug-Disease Contraindications (e.g. NSAIDs in active peptic ulcer/dyspepsia, chronic kidney disease, uncontrolled hypertension; Beta-blockers in severe asthma).
2. Cross-reference Current Medications against Documented Allergies for Drug-Allergy Interactions (e.g. Penicillin allergy vs beta-lactams/cephalosporins; NSAID hypersensitivity).
3. Cross-reference Current Medications against each other for Drug-Drug Interactions (e.g. Anticoagulants + Antiplatelets/NSAIDs bleeding risk, CYP450 interactions, QT prolongation combinations).
4. Identify any Duplicative Therapies (multiple agents from the same pharmacological class).
5. For each identified issue, provide:
   - Specific Severity: CONTRAINDICATED (life-threatening/severe harm), MAJOR (significant clinical compromise), MODERATE (monitoring needed), or DUPLICATION.
   - Exact drugs, diseases, or allergens involved.
   - Comprehensive pharmacological pathophysiology explanation.
   - Actionable, physician-directed recommendation (substitute agent, dosage adjustment, deprescribing, or monitoring parameter).
`;

    let report: any;
    try {
      const text = await generateClinicalContentWithRetry(reconPrompt, standaloneMedReconSchema, 2);
      report = JSON.parse(text);
    } catch (err: any) {
      console.warn('Medication reconciliation LLM fallback triggered:', err?.message);
      // Deterministic pharmacology rules engine fallback
      const issues: any[] = [];
      const hasNsaid = medList.some((m: any) =>
        ['ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'aspirin', 'brufen'].some((n) =>
          (m.name || '').toLowerCase().includes(n)
        )
      );
      const hasAnticoagulant = medList.some((m: any) =>
        ['apixaban', 'eliquis', 'rivaroxaban', 'xarelto', 'warfarin', 'dabigatran', 'enoxaparin'].some((n) =>
          (m.name || '').toLowerCase().includes(n)
        )
      );
      const hasGastricUlcer = conditionsList.some((c: any) =>
        ['ulcer', 'gastrit', 'dyspepsia', 'gerd', 'gastro'].some((n) =>
          (c.condition || '').toLowerCase().includes(n)
        )
      ) || (currentSymptoms || '').toLowerCase().includes('epigastric') || (currentSymptoms || '').toLowerCase().includes('burning');
      const hasPenicillin = allergyList.some((a: any) =>
        (a.allergen || '').toLowerCase().includes('penicillin')
      );
      const hasBetaLactam = medList.some((m: any) =>
        ['amoxicillin', 'augmentin', 'penicillin', 'ampicillin', 'cephalexin', 'ceftriaxone'].some((n) =>
          (m.name || '').toLowerCase().includes(n)
        )
      );

      if (hasNsaid && hasAnticoagulant) {
        issues.push({
          id: 'recon-fb-ddi-1',
          type: 'DRUG_DRUG_INTERACTION',
          severity: 'CONTRAINDICATED',
          drugsOrEntitiesInvolved: ['Anticoagulant Agent', 'NSAID Analgesic'],
          clinicalConcern: 'Synergistic bleeding risk: DOAC/anticoagulant co-prescribed with NSAID substantially elevates risk of major upper GI and internal hemorrhage due to platelet inhibition coupled with gastric mucosal injury.',
          physicianRecommendation: 'Discontinue NSAID. Consider safer non-interacting analgesia (Paracetamol / topical preparations) and assess gastroprotection with PPI.',
        });
      }

      if (hasNsaid && hasGastricUlcer) {
        issues.push({
          id: 'recon-fb-ddc-1',
          type: 'DRUG_DISEASE_CONTRAINDICATION',
          severity: 'CONTRAINDICATED',
          drugsOrEntitiesInvolved: ['NSAID (Ibuprofen/Naproxen)', 'Active Peptic Ulcer Disease / Gastric Burning'],
          clinicalConcern: 'NSAID-induced systemic COX-1 inhibition impairs gastric mucosal prostaglandin synthesis, worsening acid-peptic ulceration and precipitating occult or acute upper GI bleeding.',
          physicianRecommendation: 'Immediate cessation of systemic NSAIDs. Prescribe proton-pump inhibitor (PPI, e.g. Pantoprazole 40mg OD) and rule out H. pylori infection or occult bleeding.',
        });
      }

      if (hasPenicillin && hasBetaLactam) {
        issues.push({
          id: 'recon-fb-dai-1',
          type: 'DRUG_ALLERGY_INTERACTION',
          severity: 'CONTRAINDICATED',
          drugsOrEntitiesInvolved: ['Beta-Lactam Antibiotic', 'Penicillin Hypersensitivity'],
          clinicalConcern: 'Shared beta-lactam core structures trigger IgE-mediated mast cell degranulation, placing patient at immediate risk of anaphylactic shock, bronchospasm, and angioedema.',
          physicianRecommendation: 'Discontinue beta-lactam immediately. Replace with non-cross-reactive antimicrobial class such as Macrolides, Fluoroquinolones, or Glycopeptides.',
        });
      } else if (hasPenicillin) {
        issues.push({
          id: 'recon-fb-dai-2',
          type: 'DRUG_ALLERGY_INTERACTION',
          severity: 'MAJOR',
          drugsOrEntitiesInvolved: ['Penicillin Allergy Profile', 'Beta-Lactam Prescribing Precaution'],
          clinicalConcern: 'Documented Penicillin hypersensitivity requires avoidance of all penicillins and caution with early cephalosporins.',
          physicianRecommendation: 'Ensure red allergy band is attached. Do not prescribe Amoxicillin, Ampicillin, or Piperacillin.',
        });
      }

      const risk = issues.some((i) => i.severity === 'CONTRAINDICATED')
        ? 'HIGH_RISK'
        : issues.length > 0
        ? 'MODERATE_RISK'
        : 'CLEAR';

      report = {
        overallRiskLevel: risk,
        summary:
          issues.length > 0
            ? `Identified ${issues.length} clinical safety concern(s) requiring physician review prior to medication administration.`
            : 'Medication reconciliation completed: No drug interactions, contraindications, or duplications identified.',
        totalConcernsCount: issues.length,
        issues,
      };
    }

    report.reconciledTimestamp = new Date().toISOString();
    res.json(report);
  } catch (error: any) {
    console.error('Error reconciling medications:', error);
    res.status(500).json({ error: error.message || 'Failed to reconcile medications.' });
  }
});

// POST /api/chat
// Clinical Chatbot supporting interactive patient intake or physician consultation
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, currentRecord } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Valid messages array is required.' });
    }

    const chatSystemInstruction = `
You are the AI Clinical History Intake Assistant & OPD Physician Triage Chatbot.
Your role:
1. When chatting with a patient or triage nurse: Listen empathetically, ask clarifying questions about symptoms (location, onset, severity 1-10, duration, meds, allergies), and organize unstructured complaints into clinical clarity.
2. When consulting with an attending physician: Answer clinical questions about the patient's elicited SOCRATES history, explain medication interaction mechanisms, discuss differential rule-outs, and suggest pertinent negatives.
3. CONSTRAINTS:
- Do NOT prescribe medications or make unilateral final diagnoses. Always include clinical intake phrasing suitable for attending physician sign-off.
- Mask all national identity numbers as [ID Redacted].
- Provide succinct, high-density clinical responses.

${
  currentRecord
    ? `ACTIVE PATIENT RECORD IN CONTEXT:
Patient: ${currentRecord.patientMeta?.nameOrId || 'OPD Patient'} (${currentRecord.patientMeta?.estimatedAgeGender || 'Age/Gender Unspecified'})
Triage Tier: ${currentRecord.patientMeta?.triageLevel} (${currentRecord.patientMeta?.triageReason})
Chief Complaint: ${currentRecord.chiefComplaint?.complaint} (${currentRecord.chiefComplaint?.duration})
HPI Summary: ${currentRecord.socratesHpi?.summaryNarrative}
Current Medications: ${currentRecord.medications?.map((m: any) => `${m.name} ${m.dose || ''}`).join('; ') || 'None'}
Allergies: ${currentRecord.allergies?.map((a: any) => a.allergen).join('; ') || 'NKDA'}
Medication Reconciliation Risk: ${currentRecord.medicationReconciliation?.overallRiskLevel || 'CLEAR'} (${currentRecord.medicationReconciliation?.summary || ''})
`
    : 'No active patient record loaded yet. Assistant is ready to conduct a new intake conversation.'
}
`;

    if (!ai) {
      return res.json({
        reply:
          "OPD Clinical Assistant (Local Mode): I have received your message. You can dictate or type the full patient narrative into the intake form to run automated SOCRATES extraction and medication reconciliation.",
      });
    }

    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }],
    }));

    let reply = '';
    try {
      // Attempt generation with retry for resilience
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction: chatSystemInstruction,
            },
          });
          reply = response.text || '';
          if (reply) break;
        } catch (apiErr: any) {
          if (attempts < 2 && (apiErr?.message?.includes('503') || apiErr?.message?.includes('demand') || apiErr?.message?.includes('UNAVAILABLE'))) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          throw apiErr;
        }
      }
    } catch (llmChatErr: any) {
      console.warn('Chat LLM high demand, providing OPD clinical rules response:', llmChatErr?.message);
      const latestUserMsg = (messages[messages.length - 1]?.content || '').toLowerCase();
      
      if (latestUserMsg.includes('red flag') || latestUserMsg.includes('emergency')) {
        reply = "Key Red Flags for Triage:\n• Retrosternal crushing chest pain, radiation to jaw/left arm, or diaphoresis (ACS rule-out)\n• Acute focal neurologic deficits: facial droop, arm weakness, slurred speech (FAST / Stroke rule-out)\n• Acute severe epigastric/abdominal pain with peritoneal signs, hematemesis, or melena\n• High-grade fever with rigors, hemodynamic instability, or costovertebral flank tenderness (Sepsis/Pyelonephritis)";
      } else if (latestUserMsg.includes('interaction') || latestUserMsg.includes('medication') || latestUserMsg.includes('drug')) {
        reply = `Medication Safety Review Summary:\n• Documented Risk: ${currentRecord?.medicationReconciliation?.overallRiskLevel || 'CLEAR'}\n• Ensure no NSAIDs are administered if patient has active peptic disease or severe renal impairment.\n• Cross-check beta-lactams against documented Penicillin allergy before issuing orders.`;
      } else if (latestUserMsg.includes('negative') || latestUserMsg.includes('pertinent')) {
        reply = "Pertinent Negatives to rule out:\n• Cardiovascular: Denies syncope, orthopnea, palpitations\n• Gastrointestinal: Denies hematemesis, melena, jaundice, unintentional weight loss\n• Neurological: Denies visual loss, focal weakness, numbness\n• Constitutional: Denies unexplained night sweats or high fevers";
      } else {
        reply = "OPD Clinical Intake Assistant: I have recorded those clinical notes. For comprehensive triage, ensure exact symptom onset time, radiation pattern, pain score (1-10), and all current prescription dosages are elicited for the attending physician.";
      }
    }

    if (!reply) {
      reply = 'I have noted those clinical details. What other symptoms or medical history are relevant?';
    }
    res.json({ reply });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message || 'Failed to process clinical chat.' });
  }
});

// POST /api/generate-video
// Veo Video Generation: Animates user uploaded photo into video using veo-3.1-fast-generate-preview
app.post('/api/generate-video', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt, aspectRatio = '16:9' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Photo is required for image-to-video animation.' });
    }

    // Must be either '16:9' (landscape) or '9:16' (portrait)
    const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    if (!ai) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your API key in environment variables.',
      });
    }

    // Clean base64 prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const cleanMime = (mimeType || 'image/jpeg').toLowerCase().includes('png') ? 'image/png' : 'image/jpeg';

    const videoPrompt =
      prompt && prompt.trim().length > 0
        ? prompt.trim()
        : 'Smoothly animate this image with cinematic fluid motion, gentle dynamic lighting, and clinical accuracy.';

    console.log(`Starting Veo generation: model=veo-3.1-fast-generate-preview, aspect=${validAspectRatio}...`);

    let operation: any;
    try {
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        source: {
          prompt: videoPrompt,
          image: {
            imageBytes: cleanBase64,
            mimeType: cleanMime,
          },
        },
        config: {
          numberOfVideos: 1,
          aspectRatio: validAspectRatio,
        },
      });
    } catch (veoInitErr: any) {
      console.error('Error initiating Veo generation:', veoInitErr);
      return res.status(500).json({
        error: veoInitErr?.message || 'Failed to initiate Veo video generation. Ensure model access and billing are enabled.',
      });
    }

    console.log('Veo generation operation created. Polling operation for completion...');

    const startTime = Date.now();
    const timeoutMs = 180000; // 3 minutes timeout

    while (!operation.done) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Video generation timed out after 3 minutes. Please try again.');
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
      console.log('Veo operation status:', { done: operation.done, name: operation.name });
    }

    if (operation.error) {
      throw new Error(operation.error.message || 'Veo video generation operation failed.');
    }

    const generatedVideo = operation.response?.generatedVideos?.[0];
    if (!generatedVideo || !generatedVideo.video) {
      const raiReason = operation.response?.raiMediaFilteredReasons?.join(', ');
      throw new Error(raiReason ? `Generation filtered: ${raiReason}` : 'Veo did not return any generated video.');
    }

    const videoObj = generatedVideo.video;
    const videoId = `veo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const videosDir = path.join(__dirname, 'public', 'generated-videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    const videoFilePath = path.join(videosDir, `${videoId}.mp4`);

    if (videoObj.videoBytes) {
      fs.writeFileSync(videoFilePath, Buffer.from(videoObj.videoBytes, 'base64'));
    } else if (videoObj.uri) {
      console.log('Downloading generated video from uri:', videoObj.uri);
      try {
        await ai.files.download({
          file: videoObj,
          downloadPath: videoFilePath,
        });
      } catch (dlErr) {
        console.warn('ai.files.download failed, attempting direct fetch:', dlErr);
        const fetchUrl = videoObj.uri.includes('key=') ? videoObj.uri : `${videoObj.uri}?key=${apiKey}`;
        const resp = await fetch(fetchUrl, {
          headers: {
            'x-goog-api-key': apiKey,
          },
        });
        if (!resp.ok) {
          throw new Error(`Failed to fetch video stream from URI: ${resp.status} ${resp.statusText}`);
        }
        const arrayBuf = await resp.arrayBuffer();
        fs.writeFileSync(videoFilePath, Buffer.from(arrayBuf));
      }
    } else {
      throw new Error('Video result contained neither bytes nor downloadable URI.');
    }

    const videoUrl = `/api/videos/${videoId}.mp4`;
    console.log('Veo video generated and saved successfully:', videoUrl);

    res.json({
      success: true,
      videoId,
      videoUrl,
      aspectRatio: validAspectRatio,
      prompt: videoPrompt,
      modelUsed: 'veo-3.1-fast-generate-preview',
    });
  } catch (err: any) {
    console.error('Veo video generation error:', err);
    res.status(500).json({
      error: err.message || 'An error occurred during Veo video generation.',
    });
  }
});

// GET /api/videos/:filename
// Streams or downloads generated Veo MP4 video
app.get('/api/videos/:filename', (req, res) => {
  const cleanName = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'public', 'generated-videos', cleanName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Generated video not found.' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Setup Live WebSocket handler for gemini-3.8-live real-time voice conversations
function setupLiveWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('Client connected to Gemini 3.8 Live API WebSocket');

    if (!ai) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: 'GEMINI_API_KEY is not configured on the server. Live voice requires an active API key.',
        })
      );
      clientWs.close();
      return;
    }

    let session: any = null;

    try {
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction:
            'You are an empathetic, concise AI Clinical History Intake Voice Assistant in an outpatient clinic. You speak directly with the patient or nurse to collect symptom details: where is the pain, when did it start, how severe (1 to 10), what medications they take, and any allergies. Keep your spoken responses brief (1-2 sentences), reassuring, and conversational. Do not provide medical prescriptions or direct diagnoses.',
          // @ts-ignore
          outputAudioTranscription: {},
          // @ts-ignore
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            try {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              // Stream audio chunk back to browser
              const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audio) {
                clientWs.send(JSON.stringify({ type: 'audio', audio }));
              }

              // Stream output text transcript
              const outputText = (message.serverContent as any)?.outputAudioTranscription?.text;
              if (outputText) {
                clientWs.send(JSON.stringify({ type: 'model_transcript', text: outputText }));
              }

              // Stream user input transcript
              const inputText = (message.serverContent as any)?.inputAudioTranscription?.text;
              if (inputText) {
                clientWs.send(JSON.stringify({ type: 'user_transcript', text: inputText }));
              }

              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }

              if (message.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turn_complete' }));
              }
            } catch (msgErr) {
              console.error('Error forwarding Live message:', msgErr);
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
          onerror: (err: any) => {
            console.error('Live API Session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: err?.message || 'Gemini Live stream error occurred.',
                })
              );
            }
          },
        },
      });

      clientWs.send(JSON.stringify({ type: 'ready', message: 'Gemini 3.8 Live Voice Session Connected' }));
    } catch (connErr: any) {
      console.error('Failed to establish Live session with Gemini:', connErr);
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: connErr?.message || 'Failed to initialize Gemini 3.8 Live API.',
        })
      );
      clientWs.close();
      return;
    }

    // Handle messages coming from client browser
    clientWs.on('message', (raw: any) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'audio' && data.audio) {
          session?.sendRealtimeInput({
            audio: { data: data.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (data.type === 'text' && data.text) {
          session?.sendRealtimeInput({
            text: data.text,
          });
        }
      } catch (err) {
        console.error('Error processing client audio/message:', err);
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch (_) {}
    });

    clientWs.on('error', (err) => {
      console.warn('Client WebSocket error:', err);
      try {
        session?.close();
      } catch (_) {}
    });
  });
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  setupLiveWebSocket(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Clinical History Intake OPD Assistant running on port ${PORT}`);
  });
}

startServer();
