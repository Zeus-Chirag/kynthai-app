/**
 * sensitive health data Filter — strips patient-identifying information before sending data
 * to third-party AI services.
 *
 * What we keep (medically useful for AI):
 *   - Medication names, dosages, frequencies
 *   - Condition names (categories, not severity labels)
 *   - Allergy substances
 *   - Symptom names (no personal context)
 *   - Mood labels (no journal notes)
 *
 * What we strip (PII / not useful for medical AI):
 *   - Personal names (patient, family members, doctors)
 *   - Exact dates → relative time ranges
 *   - Free-text journal notes
 *   - Chat message content (conversation history)
 *   - Emergency alert notes and member names
 *   - Age → age range bucket
 */

type RawMedication = { name: string; dosage?: string; frequency?: string };
type RawCondition = { name: string; severity?: string };
type RawJournalEntry = {
  date?: string;
  symptoms?: unknown;
  mood?: string;
  notes?: string;
};
type RawChatMessage = { role: string; content: string };
type RawEmergencyAlert = { type?: string; memberName?: string; notes?: string; tier?: string };
type RawFamilyAlert = { type?: string; title?: string; message?: string; severity?: string };
type RawFamilyMember = { name?: string; relation?: string; conditions?: string; role?: string };

/** Convert an ISO date to a relative range string. */
function toRelativeRange(isoDate?: string): string {
  if (!isoDate) return 'unknown date';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'recently';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `within the last week`;
  if (diffDays < 30) return `within the last month`;
  return 'in the past several months';
}

/** Bucket an exact age into a range. */
function ageRange(dateOfBirth?: string): string {
  if (!dateOfBirth) return 'unknown age';
  const age = Math.floor(
    (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  if (age < 18) return 'under 18';
  if (age < 30) return '18-29';
  if (age < 50) return '30-49';
  if (age < 65) return '50-64';
  return '65 or older';
}

/**
 * Build a de-identified patient context string for AI consumption.
 * No names, exact dates, free-text notes, or chat content are included.
 */
export function buildDeidentifiedContext(params: {
  allergies?: unknown;
  dateOfBirth?: string;
  medications: RawMedication[];
  conditions: RawCondition[];
  journals: RawJournalEntry[];
  chatHistory: RawChatMessage[];
  emergencyAlerts: RawEmergencyAlert[];
  familyAlerts: RawFamilyAlert[];
  familyMembers: RawFamilyMember[];
}): string {
  const parts: string[] = [];

  // Demographics — age range only, never exact
  if (params.dateOfBirth) {
    parts.push(`AGE RANGE: ${ageRange(params.dateOfBirth)}`);
  }

  // Allergies — substances only
  let allergies: string[] = [];
  if (params.allergies) {
    if (Array.isArray(params.allergies)) {
      allergies = params.allergies.map((a: unknown) => (typeof a === 'string' ? a : String(a)));
    } else if (typeof params.allergies === 'string') {
      try {
        allergies = JSON.parse(params.allergies) as string[];
      } catch {
        allergies = [String(params.allergies)];
      }
    }
  }
  if (allergies.length > 0) {
    parts.push(
      `ALLERGIES: ${allergies.join(', ')} — do not recommend medications containing these substances.`
    );
  }

  // Medications — names, dosages, frequencies
  if (params.medications.length > 0) {
    const medList = params.medications
      .map(
        m => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`
      )
      .join(', ');
    parts.push(`MEDICATIONS: ${medList}`);
  }

  // Conditions — names only, stripped of severity/personal labels
  const uniqueConditions = [
    ...new Map(params.conditions.map(c => [c.name.toLowerCase(), c.name])).values(),
  ];
  if (uniqueConditions.length > 0) {
    parts.push(`CONDITIONS: ${uniqueConditions.join(', ')}`);
  }

  // Journal — mood labels and symptom names only, no notes, no exact dates
  const symptomSet = new Set<string>();
  const moods: string[] = [];
  for (const j of params.journals) {
    if (j.mood && !moods.includes(j.mood)) moods.push(j.mood);
    try {
      const symps = typeof j.symptoms === 'string' ? JSON.parse(j.symptoms) : j.symptoms;
      if (Array.isArray(symps)) {
        for (const s of symps) {
          const name =
            typeof s === 'string'
              ? s
              : typeof s === 'object' && s && 'name' in s
                ? String((s as { name: string }).name)
                : String(s);
          if (name && !symptomSet.has(name.toLowerCase())) symptomSet.add(name.toLowerCase());
        }
      }
    } catch {
      /* skip malformed */
    }
  }
  if (moods.length > 0) parts.push(`RECENT MOOD: ${moods.join(', ')}`);
  if (symptomSet.size > 0) parts.push(`RECENT SYMPTOMS: ${[...symptomSet].join(', ')}`);

  // Emergency alerts — type only, no names or notes
  const alertTypes = [...new Set(params.emergencyAlerts.map(a => a.type).filter(Boolean))];
  if (alertTypes.length > 0) {
    parts.push(
      `ACTIVE ALERTS: ${alertTypes.join(', ')} — see your healthcare provider if any are unresolved.`
    );
  }

  // Family context — conditions only, no names
  if (params.familyMembers.length > 0) {
    const memberConditions: string[] = [];
    for (const m of params.familyMembers) {
      if (m.conditions) {
        try {
          const conds = JSON.parse(m.conditions) as string[];
          for (const c of conds) {
            if (!memberConditions.includes(c)) memberConditions.push(c);
          }
        } catch {
          /* skip */
        }
      }
    }
    if (memberConditions.length > 0) {
      parts.push(`FAMILY CONDITIONS: ${memberConditions.join(', ')}`);
    }
  }

  if (parts.length === 0) return 'No health context available.';

  return parts.join('\n');
}
