import { IntakePresetScenario } from './types';

export const CLINICAL_PRESETS: IntakePresetScenario[] = [
  {
    id: 'acs-chest-pain',
    title: 'Acute Crushing Retrosternal Chest Pain',
    specialty: 'Emergency / Cardiology OPD',
    badge: 'Red Flag',
    summary: '58yo male with sudden crushing chest pain radiating to left jaw/arm, diaphoresis, hypertension, Aadhaar ID.',
    transcript: `Doctor, my father (age 58) suddenly developed very heavy squeezing, crushing pain right in the center of his chest about 45 minutes ago while climbing stairs. He describes it like an elephant sitting on his chest. The pain is shooting up into his left jaw and down his left arm. He is sweating profusely (cold sweats), feeling nauseated, and breathing with difficulty. 
He has a history of high blood pressure for 8 years and takes a blood pressure tablet (Amlodipine or Metoprolol, not sure of the exact dose) but forgot to take it yesterday. His Aadhaar card number is 4921 8832 9901. He has been a smoker for 25 years (about 1 pack a day). On a scale of 10, he rates the pain as 9/10. No relief with resting.`,
  },
  {
    id: 'stroke-triage',
    title: 'Acute Unilateral Weakness & Dysarthria',
    specialty: 'Neurology / Acute Triage',
    badge: 'Red Flag',
    summary: '66yo female with sudden right arm drop, slurred speech, atrial fibrillation non-compliant with DOAC, SSN provided.',
    transcript: `This is regarding Mrs. Eleanor Davis, 66 years old. About 35 minutes ago while sitting at the breakfast table, her right hand suddenly became limp and she dropped her coffee mug. When we asked what happened, her speech was thick and slurred, and we noticed the right corner of her mouth drooping. 
Her SSN is 452-98-3312. She has chronic atrial fibrillation and was prescribed Eliquis (Apixaban) 5mg twice daily, but her caregiver mentions she ran out of medication 4 days ago. She has no headache, no neck stiffness, and no prior history of stroke or TIA. She denied any chest pain or palpitations. Urgently brought to the outpatient triage desk.`,
  },
  {
    id: 'dyspepsia-nsaid',
    title: 'Epigastric Burning & NSAID Gastropathy',
    specialty: 'Gastroenterology OPD',
    badge: 'Urgent',
    summary: '38yo tech worker with 3-week gnawing nocturnal epigastric pain after chronic ibuprofen use for backache.',
    transcript: `I am a 38-year-old software engineer. For the past 3 weeks, I have had this constant burning, gnawing pain in the upper middle part of my abdomen, right under the breastbone. It usually wakes me up at night around 2 AM when my stomach is empty and feels somewhat better right after drinking a glass of cold milk or eating crackers. 
I have been taking Ibuprofen 400mg twice a day for the past month because of a lumbar strain. I haven't noticed vomiting or black tarry stools, but my appetite is down. No history of gallstones or abdominal surgery. No known drug allergies, non-smoker, drinks 1-2 beers on weekends. Severity is about 6/10 when worst.`,
  },
  {
    id: 'vernacular-hinglish',
    title: 'Pyelonephritis / Flank Colic (Multilingual Hinglish)',
    specialty: 'Urology / Internal Medicine',
    badge: 'Multilingual',
    summary: '54yo female described in Hinglish: high fever with chills, right flank pain radiating to groin, dysuria, Aadhaar ID.',
    transcript: `Namaste doctor sahab, pichle teen din se meri mummy (age 54) ko bohot tez thand lag ke bukhar (fever with chills) aa raha hai aur right side kamar mein severe dard hai jo niche groin ki taraf radiate ho raha hai. Peshaab karte waqt bohot tez jalan (burning sensation) aur dard ho raha hai, and baar-baar toilet jana pad raha hai. 
She vomited twice today morning. Mummy has Sugar (Type 2 Diabetes) since 5 years and takes Metformin 500mg roz subah shaam, par do din se theek se khana nahi kha pa rahi hain. Her Aadhaar ID is 8833 4455 2211. Pain bohot severe hai, lagbhag 8/10. Koi blood pass nahi hua urine mein as per her.`,
  },
  {
    id: 'respiratory-tb',
    title: 'Chronic Productive Cough & B-Symptoms',
    specialty: 'Pulmonology OPD',
    badge: 'Complex HPI',
    summary: '52yo foreman with 2-month productive cough, drenching night sweats, 7kg involuntary weight loss, penicillin allergy.',
    transcript: `52-year-old construction supervisor presenting with a chronic productive cough lasting for roughly 8 to 9 weeks. Sputum is thick yellowish-green, occasionally foul-smelling. He reports low-grade evening fevers and drenching night sweats requiring changing his t-shirt at night. 
He has unintentionally lost about 7 kilograms over the past 2 months. Mild exertional dyspnea when walking uphill, but no chest tightness or stridor. Denies any hemoptysis (no coughing blood). He has a 30-pack-year smoking history. He has an allergy to Penicillin which causes full-body urticarial rash and facial swelling. No previous history of tuberculosis contact known.`,
  },
];
