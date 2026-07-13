export interface Drug {
  name: string
  genericName: string
  strengths: string[]
  category: string
  commonBrands: string[]
}

const DRUGS: Drug[] = [
  {
    name: 'Metformin',
    genericName: 'Metformin Hydrochloride',
    strengths: ['500mg', '850mg', '1000mg'],
    category: 'Antidiabetic',
    commonBrands: ['Glucophage', 'Glyciphage', 'Obimet', 'Diamet', 'Metfee'],
  },
  {
    name: 'Amlodipine',
    genericName: 'Amlodipine Besylate',
    strengths: ['2.5mg', '5mg', '10mg'],
    category: 'Calcium Channel Blocker',
    commonBrands: ['Amlodac', 'Amlopin', 'Stamlo', 'Amlong', 'Vasogard'],
  },
  {
    name: 'Atorvastatin',
    genericName: 'Atorvastatin Calcium',
    strengths: ['10mg', '20mg', '40mg'],
    category: 'Statin',
    commonBrands: ['Atoris', 'Lipvas', 'Crestor', 'Stator', 'Tgtor'],
  },
  {
    name: 'Omeprazole',
    genericName: 'Omeprazole',
    strengths: ['20mg', '40mg'],
    category: 'Proton Pump Inhibitor',
    commonBrands: ['Omez', 'Omid', 'Omepraz', 'Omecap', 'Prilosec'],
  },
  {
    name: 'Paracetamol',
    genericName: 'Paracetamol (Acetaminophen)',
    strengths: ['500mg', '650mg'],
    category: 'Analgesic / Antipyretic',
    commonBrands: ['Crocin', 'Dolo', 'Calpol', 'Pandol', 'Fepanil'],
  },
  {
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    strengths: ['200mg', '400mg', '600mg'],
    category: 'NSAID',
    commonBrands: ['Brufen', 'Ibugesic', 'Combiflam', 'Mann', 'Ibuprofen'],
  },
  {
    name: 'Amoxicillin',
    genericName: 'Amoxicillin Trihydrate',
    strengths: ['250mg', '500mg'],
    category: 'Antibiotic (Penicillin)',
    commonBrands: ['Amox', 'Amoxicillin', 'Mox', 'Almox', 'Novamox'],
  },
  {
    name: 'Azithromycin',
    genericName: 'Azithromycin Dihydrate',
    strengths: ['250mg', '500mg'],
    category: 'Antibiotic (Macrolide)',
    commonBrands: ['Azee', 'Azithral', 'Zithromax', 'Azimax', 'Azirex'],
  },
  {
    name: 'Losartan',
    genericName: 'Losartan Potassium',
    strengths: ['25mg', '50mg', '100mg'],
    category: 'ARB (Antihypertensive)',
    commonBrands: ['Losacar', 'Lozar', 'Losart', 'Coxistar', 'Losanorm'],
  },
  {
    name: 'Telmisartan',
    genericName: 'Telmisartan',
    strengths: ['20mg', '40mg', '80mg'],
    category: 'ARB (Antihypertensive)',
    commonBrands: ['Telsartan', 'Telmisartan', 'Telista', 'Telmikind', 'Telis'],
  },
  {
    name: 'Pantoprazole',
    genericName: 'Pantoprazole Sodium Sesquihydrate',
    strengths: ['20mg', '40mg'],
    category: 'Proton Pump Inhibitor',
    commonBrands: ['Pantop', 'Pantodac', 'Pan', 'Pantocid', 'Ulgel'],
  },
  {
    name: 'Domperidone',
    genericName: 'Domperidone',
    strengths: ['10mg'],
    category: 'Antiemetic / Prokinetic',
    commonBrands: ['Domstal', 'Peridal', 'Motinorm', 'Domper', 'Doperidone'],
  },
  {
    name: 'Diclofenac',
    genericName: 'Diclofenac Sodium',
    strengths: ['25mg', '50mg'],
    category: 'NSAID',
    commonBrands: ['Voltaren', 'Voveran', 'Diclogesic', 'Oflam', 'Dicloran'],
  },
  {
    name: 'Prednisolone',
    genericName: 'Prednisolone Acetate',
    strengths: ['5mg', '10mg', '20mg'],
    category: 'Corticosteroid',
    commonBrands: ['Predmet', 'Wysolone', 'Decadron', 'Sterapred', 'Prednisolone'],
  },
  {
    name: 'Salbutamol',
    genericName: 'Salbutamol (Albuterol) Sulphate',
    strengths: ['2mg', '4mg', 'Inhaler 100mcg'],
    category: 'Beta-2 Agonist (Bronchodilator)',
    commonBrands: ['Asthalin', 'Ventolin', 'Salbutamol', 'Proventil', 'Aerocort'],
  },
  {
    name: 'Montelukast',
    genericName: 'Montelukast Sodium',
    strengths: ['4mg', '10mg'],
    category: 'Leukotriene Receptor Antagonist',
    commonBrands: ['Montair', 'Montelast', 'Montina', 'Montemac', 'Singulair'],
  },
  {
    name: 'Cetirizine',
    genericName: 'Cetirizine Hydrochloride',
    strengths: ['5mg', '10mg'],
    category: 'Antihistamine',
    commonBrands: ['Cetzine', 'Alerid', 'Cetizin', 'Cetcip', 'Cetrite'],
  },
  {
    name: 'Levocetirizine',
    genericName: 'Levocetirizine Dihydrochloride',
    strengths: ['5mg'],
    category: 'Antihistamine',
    commonBrands: ['L-Cet', 'Levocet', 'Xyzal', 'Levolved', 'Cetzine-L'],
  },
  {
    name: 'Ciprofloxacin',
    genericName: 'Ciprofloxacin Hydrochloride',
    strengths: ['250mg', '500mg'],
    category: 'Antibiotic (Fluoroquinolone)',
    commonBrands: ['Ciplox', 'Cifran', 'Cipro', 'Ciprolar', 'Quinolid'],
  },
]

export function searchDrugs(query: string): Drug[] {
  const q = query.toLowerCase().trim()
  if (!q) return DRUGS

  return DRUGS.filter(
    (drug) =>
      drug.name.toLowerCase().includes(q) ||
      drug.genericName.toLowerCase().includes(q) ||
      drug.category.toLowerCase().includes(q) ||
      drug.commonBrands.some((b) => b.toLowerCase().includes(q)) ||
      drug.strengths.some((s) => s.toLowerCase().includes(q)),
  )
}
