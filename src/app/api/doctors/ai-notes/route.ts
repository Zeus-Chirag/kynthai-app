import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/security"
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson } from "@/lib/api-helpers"
import { logAudit } from '@/lib/auth'
import { logger } from "@/lib/logger"
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  if (user.role !== "doctor") return jsonError("Only doctors may use AI notes", 403)

  await logAudit(user.id, 'doctor.ai_notes.generate', { resourceType: 'ConsultationNote' })
  const profile = await db.doctorProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return jsonError("Doctor profile not found", 404)
  const body = await readJson<{ appointmentId?: string; transcript?: string; symptoms?: string[]; medications?: Array<{name:string;dosage:string;frequency:string;instructions?:string}>; diagnosis?: string; followUpDate?: string; patientId?: string }>(req)
  if (!body) return jsonError("Invalid JSON", 400)
  const rawSymptoms = body.symptoms || extractSymptomsFromText(body.transcript || "")
  if (rawSymptoms.length === 0 && !body.transcript?.trim()) return jsonError("Provide transcript or symptoms", 400)
  let patientId = body.patientId
  if (!patientId && body.appointmentId) {
    const apt = await db.appointment.findUnique({ where: { id: body.appointmentId }, select: { patientId: true } })
    if (!apt) return jsonError("Appointment not found", 404)
    patientId = apt.patientId
  }
  if (!patientId) return jsonError("patientId or appointmentId required", 400)
  const treatmentLink = await db.appointment.findFirst({ where: { doctorId: profile.id, patientId } })
  if (!treatmentLink) return jsonError("You do not treat this patient", 403)
  const interactions = checkDrugInteractions(body.medications || [])
  const diagnosis = body.diagnosis || buildDiagnosis(rawSymptoms)
  const followUpDate = body.followUpDate ? new Date(body.followUpDate) : new Date(Date.now() + 10*24*60*60*1000)
  let confidence = 30
  if (rawSymptoms.length > 0) confidence += 20
  if (body.medications && body.medications.length > 0) confidence += 20
  const transcriptStr = typeof body.transcript === 'string' ? body.transcript : ''
  if (transcriptStr.trim().length > 50) confidence += 20
  if (interactions.length === 0) confidence += 10
  confidence = Math.min(95, confidence)
  const noteContent = buildNoteContent({ symptoms: rawSymptoms, diagnosis, medications: body.medications ?? [], followUpDate: followUpDate.toISOString().split("T")[0]!, interactions, confidence, transcript: body.transcript ?? "" })
  try {
    const note = await db.consultationNote.create({ data: { doctorId: profile.id, patientId, content: noteContent, type: "diagnosis" } })
    return jsonOk({ note: { id: note.id, doctorId: note.doctorId, patientId: note.patientId, content: note.content, type: note.type, createdAt: note.createdAt.toISOString() }, suggestions: { symptoms: rawSymptoms, diagnosis, medications: body.medications || [], followUpDate: followUpDate.toISOString().split("T")[0]!, interactions, confidence } })
  } catch (error) {
    // Security: never log raw diagnosis content or AI errors
    logger.phiSafeError(error, 'doctors.ai-notes.POST')
    return jsonError('Failed to save AI note', 500)
  }
}

const SYMPTOM_KEYWORDS: Record<string, string[]> = { fever: ["fever","temperature","pyrexia","hot","burning","chills","shivering"], cough: ["cough","coughing","dry cough","wet cough","phlegm"], cold: ["cold","runny nose","sneezing","congestion","blocked nose","nasal"], headache: ["headache","head pain","migraine","head ache","cephalalgia"], bodyPain: ["body pain","body ache","muscle pain","joint pain","myalgia","arthralgia"], diarrhea: ["diarrhea","loose motion","loose stools","dysentery"], nausea: ["nausea","vomiting","throw up","sick","queasy"], breathlessness: ["breathless","shortness of breath","dyspnea","wheezing","difficulty breathing"], chestPain: ["chest pain","chest discomfort","angina","tightness in chest"], fatigue: ["fatigue","tired","exhausted","weakness","lethargy","tiredness"], dizziness: ["dizzy","dizziness","vertigo","lightheaded","fainting"], skinRash: ["rash","skin rash","itching","pruritus","hives","urticaria"], swelling: ["swelling","edema","bloated","puffy","inflammation"], soreThroat: ["sore throat","throat pain","pharyngitis","throat irritation"], indigestion: ["indigestion","acidity","heartburn","gas","bloating","gastric"], urinary: ["urinary","urination","burning urination","frequency","UTI"], diabetes: ["diabetes","blood sugar","hyperglycemia","polyuria","excessive thirst"], hypertension: ["hypertension","high blood pressure","BP high","blood pressure high"], asthma: ["asthma","wheeze","bronchospasm","inhaler"], allergy: ["allergy","allergic","hypersensitivity","sneezing fits"] }
function extractSymptomsFromText(text: string): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const [symptom, keywords] of Object.entries(SYMPTOM_KEYWORDS)) { if (keywords.some((kw) => lower.includes(kw))) found.push(symptom) }
  return [...new Set(found)]
}
const DRUG_INTERACTIONS: Array<{drugA:string;drugB:string;severity:"minor"|"moderate"|"major";description:string}> = [
  {drugA:"Metformin",drugB:"Ibuprofen",severity:"moderate",description:"NSAIDs may reduce metformin efficacy and increase lactic acidosis risk in renal impairment."},
  {drugA:"Metformin",drugB:"Prednisolone",severity:"moderate",description:"Corticosteroids may antagonize hypoglycemic effect of metformin."},
  {drugA:"Atorvastatin",drugB:"Clarithromycin",severity:"major",description:"Strong CYP3A4 inhibitors significantly increase atorvastatin plasma concentration — risk of myopathy."},
  {drugA:"Losartan",drugB:"Ibuprofen",severity:"moderate",description:"NSAIDs may reduce antihypertensive effect of ARBs and impair renal function."},
  {drugA:"Losartan",drugB:"Diclofenac",severity:"moderate",description:"NSAIDs may blunt antihypertensive effect and increase nephrotoxicity risk."},
  {drugA:"Amoxicillin",drugB:"Allopurinol",severity:"moderate",description:"Increased risk of skin rash when used together."},
  {drugA:"Azithromycin",drugB:"Warfarin",severity:"major",description:"May enhance anticoagulant effect — monitor INR closely."},
  {drugA:"Omeprazole",drugB:"Clopidogrel",severity:"major",description:"Omeprazole reduces activation of clopidogrel — consider alternative PPI."},
  {drugA:"Telmisartan",drugB:"Ibuprofen",severity:"moderate",description:"Concurrent use may reduce antihypertensive effect and worsen renal function."},
  {drugA:"Cetirizine",drugB:"Theophylline",severity:"minor",description:"Possible reduction in cetirizine clearance at high theophylline doses."},
  {drugA:"Montelukast",drugB:"Prednisolone",severity:"minor",description:"No clinically significant interaction — generally safe to co-administer."},
  {drugA:"Pantoprazole",drugB:"Methotrexate",severity:"moderate",description:"PPIs may reduce renal clearance of methotrexate — monitor for toxicity."},
  {drugA:"Salbutamol",drugB:"Beta-blockers",severity:"major",description:"Non-selective beta-blockers antagonize salbutamol — may cause bronchospasm."} ]
function checkDrugInteractions(meds: Array<{name:string}>): Array<{drugA:string;drugB:string;severity:string;description:string}> {
  if (meds.length < 2) return []
  const names = meds.map((m) => m.name)
  const found: Array<{drugA:string;drugB:string;severity:string;description:string}> = []
  for (let i = 0; i < names.length; i++) { for (let j = i + 1; j < names.length; j++) { const ix = DRUG_INTERACTIONS.find((x) => (x.drugA === names[i] && x.drugB === names[j]) || (x.drugA === names[j] && x.drugB === names[i])); if (ix) found.push(ix) } }
  return found
}
const DIAGNOSIS_MAP: Record<string, string> = { fever:"Fever",cough:"Cough",cold:"Upper Respiratory Infection",headache:"Headache", bodyPain:"Myalgia/Arthralgia",diarrhea:"Gastroenteritis",nausea:"Nausea", breathlessness:"Respiratory distress",chestPain:"Chest pain",fatigue:"Fatigue syndrome", dizziness:"Dizziness",skinRash:"Dermatitis",swelling:"Inflammation", soreThroat:"Pharyngitis",indigestion:"Indigestion",urinary:"Urinary symptoms", diabetes:"Diabetes management",hypertension:"Hypertension",asthma:"Asthma",allergy:"Allergic reaction" }
function buildDiagnosis(symptoms: string[]): string {
  if (symptoms.length === 0) return "Clinical assessment pending."
  const labels = symptoms.map((s) => DIAGNOSIS_MAP[s] ?? s)
  if (labels.length === 1) return `Likely ${labels[0]}. Clinical correlation advised.`
  return `Presenting with ${labels.join(", ")}. Differential diagnosis to be considered.`
}
function buildNoteContent(data: { symptoms: string[]; diagnosis: string; medications: Array<{name:string;dosage:string;frequency:string;instructions?:string}>; followUpDate: string; interactions: Array<{drugA:string;drugB:string;severity:string;description:string}>; confidence: number; transcript: string }): string {
  const lines: string[] = ["=== AI-Generated Consultation Note ===", ""]
  if (data.transcript) { lines.push("--- Transcript ---"); lines.push(data.transcript); lines.push("") }
  lines.push("--- Symptoms ---")
  if (data.symptoms.length > 0) data.symptoms.forEach((s) => lines.push("• " + s)); else lines.push("None detected")
  lines.push("")
  lines.push("--- Diagnosis ---"); lines.push(data.diagnosis); lines.push("")
  if (data.medications.length > 0) { lines.push("--- Prescribed Medications ---"); data.medications.forEach((m) => { lines.push("• " + m.name + " " + m.dosage + " — " + m.frequency); if (m.instructions) lines.push("  " + m.instructions) }); lines.push("") }
  if (data.interactions.length > 0) { lines.push("--- Drug Interaction Warnings ---"); data.interactions.forEach((ix) => { lines.push("⚠ [" + ix.severity.toUpperCase() + "] " + ix.drugA + " + " + ix.drugB + ": " + ix.description) }); lines.push("") }
  lines.push("--- Follow-up ---"); lines.push(data.followUpDate); lines.push(""); lines.push("--- AI Confidence: " + data.confidence + "% ---")
  return lines.join('\n')
}
