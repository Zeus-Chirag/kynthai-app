/**
 * Extended Medicine DB — additional medications not in medicine-db-cache.ts.
 *
 * Merged into the main DB via medicine-db-cache.ts.
 */

export interface ExtendedMedicineInfo {
  name: string;
  genericName: string;
  category: string;
  commonUses: string[];
  dosage: string;
  sideEffects: string[];
  foodInteractions: string[];
  timing: string;
  pregnancySafety: string;
  storage: string;
}

export const EXTENDED_MEDICINE_DB: Record<string, ExtendedMedicineInfo> = {
  lisinopril: {
    name: 'Lisinopril',
    genericName: 'Lisinopril Dihydrate',
    category: 'ACE Inhibitor',
    commonUses: [
      'High blood pressure (hypertension)',
      'Heart failure',
      'Post-heart attack recovery',
      'Kidney protection in diabetes',
    ],
    dosage:
      '10-40mg once daily for hypertension. Heart failure: start 5mg, titrate to 20-35mg. Initial: 10mg.',
    sideEffects: [
      'Dry cough (common — 5-20% of patients)',
      'Dizziness',
      'Headache',
      'Fatigue',
      'Stomach upset',
      'Rare: Angioedema (swelling of face/airway — emergency)',
    ],
    foodInteractions: [
      'Can take with or without food',
      'Avoid potassium supplements and salt substitutes (hyperkalemia risk)',
      'Avoid NSAIDs (reduced efficacy, kidney risk)',
      'Limit alcohol',
    ],
    timing: 'Same time each day, morning preferred.',
    pregnancySafety:
      'Category D — DO NOT use during pregnancy. Associated with fetal toxicity. Discontinue ASAP if pregnancy detected.',
    storage: 'Store at room temperature (15-30°C). Protect from moisture.',
  },
  gabapentin: {
    name: 'Gabapentin',
    genericName: 'Gabapentin',
    category: 'Anticonvulsant / Neuropathic Pain',
    commonUses: [
      'Neuropathic pain',
      'Postherpetic neuralgia (shingles pain)',
      'Epilepsy seizures (adjunctive)',
      'Restless legs syndrome',
      'Fibromyalgia (off-label)',
    ],
    dosage:
      'Neuropathic pain: 100-300mg 3 times daily. Max: 3600mg/day. Start low and titrate up. Renally dosed.',
    sideEffects: [
      'Drowsiness',
      'Dizziness',
      'Fatigue',
      'Peripheral edema',
      'Weight gain',
      'Dry mouth',
      'Blurred vision',
    ],
    foodInteractions: [
      'Can take with or without food',
      'Avoid alcohol (increases CNS depression)',
      'Antacids reduce absorption — separate by 2+ hours',
    ],
    timing: '3 times daily (every 8 hours), consistently with meals to reduce GI upset.',
    pregnancySafety:
      'Category C — fetal risk not ruled out. Consult doctor. May be continued if benefits outweigh risks.',
    storage: 'Store at room temperature (20-25°C). Keep capsules dry.',
  },
  sertraline: {
    name: 'Sertraline',
    genericName: 'Sertraline Hydrochloride',
    category: 'SSRI Antidepressant',
    commonUses: [
      'Major depressive disorder',
      'Generalized anxiety disorder (GAD)',
      'Panic disorder',
      'OCD',
      'PTSD',
      'Social anxiety disorder',
    ],
    dosage: '25-200mg once daily. Start at 25-50mg. May take 4-6 weeks for full effect.',
    sideEffects: [
      'Nausea (usually resolves in 1-2 weeks)',
      'Diarrhea',
      'Insomnia or drowsiness',
      'Sexual dysfunction (decreased libido, anorgasmia)',
      'Weight changes (initial loss, possible gain long-term)',
      'Dry mouth',
    ],
    foodInteractions: [
      'Can take with or without food',
      'Take with food if nausea occurs',
      'Avoid alcohol (increases sedation and serotonin syndrome risk)',
      'Avoid grapefruit juice',
    ],
    timing: 'Same time each day. Morning preferred if causing insomnia. Take consistently.',
    pregnancySafety:
      'Category C — associated with rare fetal heart defects in 1st trimester. Do NOT stop without doctor. Continue if benefits > risks.',
    storage: 'Store at room temperature (15-30°C). Protect from moisture.',
  },
  fluoxetine: {
    name: 'Fluoxetine',
    genericName: 'Fluoxetine Hydrochloride',
    category: 'SSRI Antidepressant',
    commonUses: [
      'Major depressive disorder',
      'OCD',
      'Bulimia nervosa',
      'Panic disorder',
      'PMDD (premenstrual dysphoric disorder)',
    ],
    dosage:
      '20-80mg once daily. Start 20mg. Long half-life (4-6 days) — steady state in 4-6 weeks.',
    sideEffects: [
      'Anxiety (initial)',
      'Nausea',
      'Insomnia or sleepiness',
      'Sexual dysfunction',
      'Weight changes',
      'Sweating',
    ],
    foodInteractions: [
      'Can take with or without food',
      'Take with food if nausea occurs',
      'Avoid alcohol',
      'Do NOT mix with MAO inhibitors (serotonin syndrome risk)',
    ],
    timing: 'Morning with or without food.',
    pregnancySafety:
      'Category C — one of the preferred SSRIs in pregnancy if treatment needed. Monitor newborn for adaptation syndrome.',
    storage: 'Store at room temperature (15-30°C).',
  },
  albuterol: {
    name: 'Albuterol',
    genericName: 'Albuterol Sulfate (Salbutamol)',
    category: 'Short-acting Beta-2 Agonist (SABA)',
    commonUses: [
      'Asthma rescue inhaler',
      'COPD exacerbations',
      'Exercise-induced bronchospasm',
      'Acute bronchospasm',
    ],
    dosage: 'Inhaler: 1-2 puffs every 4-6 hours as needed. Nebulizer: 2.5mg every 4-6 hours.',
    sideEffects: [
      'Tremor',
      'Nervousness',
      'Headache',
      'Rapid heartbeat (tachycardia)',
      'Throat irritation',
      'Paradoxical bronchospasm (rare — stop use)',
    ],
    foodInteractions: [
      'No major food interactions',
      'Avoid taking with beta-blockers (antagonistic)',
    ],
    timing: 'As needed for symptoms. Use before exercise for prevention. Peak effect: 15-30 min.',
    pregnancySafety: 'Category C — use if clearly needed. Preferred rescue inhaler in pregnancy.',
    storage:
      'Store at room temperature. Do not freeze. Store inhaler away from heat (acts as propellant).',
  },
  trazodone: {
    name: 'Trazodone',
    genericName: 'Trazodone Hydrochloride',
    category: 'SARI Antidepressant',
    commonUses: [
      'Insomnia (low dose — frequently prescribed off-label)',
      'Depression',
      'Anxiety',
      'Panic disorder',
    ],
    dosage: 'Sleep: 25-100mg at bedtime. Depression: 150-300mg daily in divided doses.',
    sideEffects: [
      'Drowsiness (beneficial at bedtime)',
      'Dizziness',
      'Blurred vision',
      'Dry mouth',
      'Orthostatic hypotension (dizziness on standing)',
      'Priapism (rare but serious — seek ER if prolonged erection >4 hours)',
      'Headache',
    ],
    foodInteractions: [
      'Take with food to reduce dizziness and orthostatic hypotension',
      'Avoid alcohol',
      'Avoid grapefruit juice',
    ],
    timing:
      'After dinner/snack and before bed (food reduces side effects; drowsiness helps sleep).',
    pregnancySafety: 'Category C — use only if clearly needed.',
    storage: 'Store at room temperature (20-25°C). Protect from light.',
  },
  prednisone: {
    name: 'Prednisone',
    genericName: 'Prednisone',
    category: 'Corticosteroid',
    commonUses: [
      'Inflammatory conditions (arthritis, asthma, COPD)',
      'Autoimmune diseases (lupus, IBD)',
      'Allergic reactions',
      'Cancer symptom management',
      'Prevention of organ rejection',
    ],
    dosage:
      'Varies widely: 5-60mg daily depending on condition. Short courses: 20-40mg for 5-10 days. Taper if >2 weeks.',
    sideEffects: [
      'Insomnia',
      'Weight gain (fluid retention)',
      'Mood changes (euphoria, irritability)',
      'Increased appetite',
      'High blood sugar (diabetes risk)',
      'Osteoporosis (long-term)',
      'Increased infection risk',
      'Gastric ulcers (co-prescribe PPI)',
    ],
    foodInteractions: [
      'Take with food to protect stomach',
      'Avoid calcium-rich foods (prednisone reduces calcium absorption)',
      'Limit sodium (salt) intake (prednisone causes fluid retention)',
      'Increase potassium intake (bananas, oranges)',
    ],
    timing: 'Morning with breakfast (mimics natural cortisol rhythm, reduces insomnia).',
    pregnancySafety:
      'Category B — generally safe but use lowest effective dose. Crosses placenta — monitor fetal growth.',
    storage: 'Store at room temperature (20-25°C). Keep away from moisture and heat.',
  },
  furosemide: {
    name: 'Furosemide',
    genericName: 'Furosemide (Lasix)',
    category: 'Loop Diuretic',
    commonUses: [
      'Edema (fluid retention) — heart failure, liver disease, kidney disease',
      'Hypertension',
      'Hyperkalemia (high potassium)',
    ],
    dosage: '20-80mg once daily. May increase to 600mg/day in divided doses for resistant edema.',
    sideEffects: [
      'Frequent urination',
      'Dizziness',
      'Low potassium (hypokalemia)',
      'Low sodium (hyponatremia)',
      'Low magnesium',
      'Dehydration',
      'Ringing in ears (ototoxicity — at high doses)',
    ],
    foodInteractions: [
      'Take with food to reduce stomach upset',
      'Increase potassium intake (bananas, oranges, potatoes)',
      'Reduce sodium intake',
      'Avoid NSAIDs (reduce diuretic effectiveness)',
    ],
    timing: 'Morning (to avoid nighttime bathroom trips).',
    pregnancySafety: 'Category C — use only if clearly needed.',
    storage: 'Store at room temperature (15-30°C). Protect from light.',
  },
  spironolactone: {
    name: 'Spironolactone',
    genericName: 'Spironolactone',
    category: 'Potassium-sparing Diuretic / Aldosterone Antagonist',
    commonUses: [
      'Heart failure',
      'Hypertension',
      'Edema',
      'Acne (low dose off-label)',
      'Hirsutism in women (anti-androgen effect)',
      'PCOS management',
    ],
    dosage: 'Heart failure: 25-50mg daily. Acne/hirsutism: 50-100mg daily. Max: 400mg/day.',
    sideEffects: [
      'Hyperkalemia (high potassium — serious risk)',
      'Gynecomastia (breast development in men)',
      'Menstrual irregularities',
      'Drowsiness',
      'Headache',
      'GI upset',
    ],
    foodInteractions: [
      'Avoid potassium supplements and salt substitutes',
      'Avoid high-potassium foods (bananas, oranges, tomatoes)',
      'Limit alcohol',
    ],
    timing: 'Morning, same time each day.',
    pregnancySafety:
      'Category C — not recommended in pregnancy due to anti-androgen effects (can feminize male fetus).',
    storage: 'Store at room temperature (20-25°C). Protect from light.',
  },
  'hydrocodone/acetaminophen': {
    name: 'Hydrocodone/Acetaminophen',
    genericName: 'Hydrocodone Bitartrate + Acacetaminophen (Vicodin, Norco)',
    category: 'Opioid Analgesic Combination',
    commonUses: ['Moderate to severe pain', 'Post-surgical pain', 'Injury-related pain'],
    dosage:
      '1-2 tablets every 4-6 hours as needed. Max: 8 tablets/day (4000mg acetaminophen limit).',
    sideEffects: [
      'Drowsiness',
      'Constipation',
      'Nausea',
      'Respiratory depression (serious — highest risk)',
      'Mood changes',
      'Dependence/addiction risk',
      'LIVER DAMAGE from acetaminophen overdose (serious)',
    ],
    foodInteractions: [
      'Take with food to reduce nausea',
      'Avoid alcohol (increases liver toxicity, respiratory depression)',
      'Do not combine with other opioids',
      'Do not exceed 4000mg acetaminophen/day',
    ],
    timing: 'Every 4-6 hours as needed for pain. May take with food.',
    pregnancySafety:
      'Category C — opioid use near delivery can cause neonatal withdrawal. Use only if clearly needed.',
    storage:
      'Store in a secure location (opioid — risk of abuse/accidental exposure). Room temperature.',
  },
  simvastatin: {
    name: 'Simvastatin',
    genericName: 'Simvastatin',
    category: 'Lipid-lowering (Statin)',
    commonUses: ['High cholesterol', 'Heart disease prevention', 'Stroke prevention'],
    dosage:
      '5-40mg once daily in the evening. START LOW — avoid 80mg dose (myopathy risk). Max: 40mg/day.',
    sideEffects: [
      'Muscle pain (myalgia)',
      'Elevated liver enzymes',
      'Headache',
      'Constipation',
      'Rare: Rhabdomyolysis (serious muscle breakdown)',
    ],
    foodInteractions: [
      'Take with evening meal',
      'Avoid grapefruit juice (significantly increases drug levels)',
      'Limit alcohol',
      'No red yeast rice (contains monacolin K, additive effect)',
    ],
    timing: 'Evening with dinner (cholesterol production peaks at night).',
    pregnancySafety: 'Category X — DO NOT use during pregnancy or breastfeeding.',
    storage: 'Store at room temperature (20-25°C). Protect from light.',
  },
  citalopram: {
    name: 'Citalopram',
    genericName: 'Citalopram Hydrobromide',
    category: 'SSRI Antidepressant',
    commonUses: ['Major depressive disorder', 'Anxiety disorder', 'Geriatric depression'],
    dosage: '10-40mg once daily. Start 10-20mg. Elderly/max: 20mg/day (QT prolongation risk).',
    sideEffects: [
      'Nausea',
      'Dry mouth',
      'Drowsiness',
      'Insomnia',
      'Sexual dysfunction',
      'Headache',
      'QT prolongation (dose-dependent — monitor at high doses)',
    ],
    foodInteractions: ['Can take with or without food', 'Avoid alcohol', 'Avoid grapefruit'],
    timing: 'Morning or evening, same time each day.',
    pregnancySafety:
      'Category C — use only if clearly needed. Monitor for neonatal adaptation syndrome.',
    storage: 'Store at room temperature (15-30°C).',
  },
  meloxicam: {
    name: 'Meloxicam',
    genericName: 'Meloxicam',
    category: 'NSAID (COX-2 preferential)',
    commonUses: [
      'Osteoarthritis',
      'Rheumatoid arthritis',
      'Juvenile idiopathic arthritis',
      'Pain and inflammation',
    ],
    dosage: '7.5-15mg once daily. Minimum effective dose for shortest duration.',
    sideEffects: [
      'Stomach pain',
      'Heartburn',
      'Nausea',
      'Increased cardiovascular risk',
      'Liver enzyme elevation',
      'Kidney impairment',
    ],
    foodInteractions: ['Take with food to protect stomach', 'Avoid alcohol', 'Avoid other NSAIDs'],
    timing: 'With breakfast, same time each day.',
    pregnancySafety: 'Category C/D — avoid after 30 weeks. Not recommended in pregnancy.',
    storage: 'Store at room temperature (15-30°C).',
  },
  valsartan: {
    name: 'Valsartan',
    genericName: 'Valsartan',
    category: 'Angiotensin II Receptor Blocker (ARB)',
    commonUses: [
      'High blood pressure',
      'Heart failure',
      'Post-heart attack recovery',
      'Diabetic kidney disease',
    ],
    dosage: '80-320mg once daily. Start 80mg. Max: 320mg/day.',
    sideEffects: [
      'Dizziness',
      'Headache',
      'Fatigue',
      'Upper respiratory infection',
      'Low blood pressure',
    ],
    foodInteractions: [
      'Can take with or without food',
      'Avoid potassium supplements',
      'Limit sodium/ salt intake',
      'Avoid NSAIDs',
    ],
    timing: 'Same time each day, morning preferred.',
    pregnancySafety: 'Category D — DO NOT use during pregnancy.',
    storage: 'Store at room temperature (20-25°C). Protect from moisture.',
  },
  bupropion: {
    name: 'Bupropion',
    genericName: 'Bupropion Hydrochloride (Wellbutrin, Zyban)',
    category: 'NDRI Antidepressant / Smoking Cessation',
    commonUses: [
      'Major depressive disorder',
      'Seasonal affective disorder (SAD)',
      'Smoking cessation (Zyban)',
      'ADHD (off-label)',
    ],
    dosage: '150-300mg once daily (SR) or 450mg extended-release (XL). Do NOT exceed 450mg/day.',
    sideEffects: [
      'Insomnia',
      'Dry mouth',
      'Headache',
      'Nausea',
      'Increased sweating',
      'Anxiety/agitation (initial)',
      'Weight loss (vs weight gain with other antidepressants)',
      'Seizure risk (dose-dependent — highest at >450mg/day)',
    ],
    foodInteractions: [
      'Can take with or without food',
      'Avoid alcohol (increases CNS stimulation, seizure risk)',
      'Limit caffeine',
    ],
    timing: 'Morning with or without food (can cause insomnia if taken late).',
    pregnancySafety: 'Category B — use only if clearly needed.',
    storage: 'Store at room temperature (15-30°C). Protect from moisture.',
  },
};

export default EXTENDED_MEDICINE_DB;
