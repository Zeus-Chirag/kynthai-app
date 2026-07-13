export interface Drug {
  name: string;
  genericName: string;
  strengths: string[];
  category: string;
  commonBrands: string[];
}

const DRUGS: Drug[] = [
  {
    name: 'Metformin',
    genericName: 'Metformin Hydrochloride',
    strengths: ['500mg', '850mg', '1000mg'],
    category: 'Antidiabetic',
    commonBrands: ['Glucophage', 'Fortamet', 'Glumetza', 'Riomet'],
  },
  {
    name: 'Amlodipine',
    genericName: 'Amlodipine Besylate',
    strengths: ['2.5mg', '5mg', '10mg'],
    category: 'Calcium Channel Blocker',
    commonBrands: ['Norvasc', 'Amlodipine'],
  },
  {
    name: 'Atorvastatin',
    genericName: 'Atorvastatin Calcium',
    strengths: ['10mg', '20mg', '40mg'],
    category: 'Statin',
    commonBrands: ['Lipitor', 'Atorvastatin'],
  },
  {
    name: 'Omeprazole',
    genericName: 'Omeprazole',
    strengths: ['20mg', '40mg'],
    category: 'Proton Pump Inhibitor',
    commonBrands: ['Prilosec', 'Nexium', 'Omeprazole'],
  },
  {
    name: 'Paracetamol',
    genericName: 'Paracetamol (Acetaminophen)',
    strengths: ['500mg', '650mg'],
    category: 'Analgesic / Antipyretic',
    commonBrands: ['Tylenol', 'Panadol', 'Calpol', 'Paracetamol'],
  },
  {
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    strengths: ['200mg', '400mg', '600mg'],
    category: 'NSAID',
    commonBrands: ['Advil', 'Motrin', 'Nuprin', 'Ibuprofen'],
  },
  {
    name: 'Amoxicillin',
    genericName: 'Amoxicillin Trihydrate',
    strengths: ['250mg', '500mg'],
    category: 'Antibiotic (Penicillin)',
    commonBrands: ['Amoxil', 'Amoxicillin', 'Moxatag'],
  },
  {
    name: 'Azithromycin',
    genericName: 'Azithromycin Dihydrate',
    strengths: ['250mg', '500mg'],
    category: 'Antibiotic (Macrolide)',
    commonBrands: ['Zithromax', 'Z-PAK', 'Azithromycin', 'Azithro'],
  },
  {
    name: 'Losartan',
    genericName: 'Losartan Potassium',
    strengths: ['25mg', '50mg', '100mg'],
    category: 'ARB (Antihypertensive)',
    commonBrands: ['Cozaar', 'Losartan'],
  },
  {
    name: 'Telmisartan',
    genericName: 'Telmisartan',
    strengths: ['20mg', '40mg', '80mg'],
    category: 'ARB (Antihypertensive)',
    commonBrands: ['Micardis', 'Telmisartan'],
  },
  {
    name: 'Pantoprazole',
    genericName: 'Pantoprazole Sodium Sesquihydrate',
    strengths: ['20mg', '40mg'],
    category: 'Proton Pump Inhibitor',
    commonBrands: ['Protonix', 'Pantoprazole'],
  },
  {
    name: 'Metoclopramide',
    genericName: 'Metoclopramide Hydrochloride',
    strengths: ['5mg', '10mg'],
    category: 'Antiemetic / Prokinetic',
    commonBrands: ['Reglan', 'Metozolv', 'Metoclopramide'],
  },
  {
    name: 'Diclofenac',
    genericName: 'Diclofenac Sodium',
    strengths: ['25mg', '50mg'],
    category: 'NSAID',
    commonBrands: ['Voltaren', 'Pennsaid', 'Voltarol', 'Diclofenac'],
  },
  {
    name: 'Prednisolone',
    genericName: 'Prednisolone Acetate',
    strengths: ['5mg', '10mg', '20mg'],
    category: 'Corticosteroid',
    commonBrands: ['Millipred', 'Prelone', 'Prednisolone'],
  },
  {
    name: 'Salbutamol',
    genericName: 'Salbutamol (Albuterol) Sulphate',
    strengths: ['2mg', '4mg', 'Inhaler 100mcg'],
    category: 'Beta-2 Agonist (Bronchodilator)',
    commonBrands: ['Ventolin', 'ProAir', 'Proventil', 'Salbutamol'],
  },
  {
    name: 'Montelukast',
    genericName: 'Montelukast Sodium',
    strengths: ['4mg', '10mg'],
    category: 'Leukotriene Receptor Antagonist',
    commonBrands: ['Singulair', 'Montelukast'],
  },
  {
    name: 'Cetirizine',
    genericName: 'Cetirizine Hydrochloride',
    strengths: ['5mg', '10mg'],
    category: 'Antihistamine',
    commonBrands: ['Zyrtec', 'Reactine', 'Allerga'],
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
    commonBrands: ['Cipro', 'Cipro XR'],
  },
];

export function searchDrugs(query: string): Drug[] {
  const q = query.toLowerCase().trim();
  if (!q) return DRUGS;

  return DRUGS.filter(
    drug =>
      drug.name.toLowerCase().includes(q) ||
      drug.genericName.toLowerCase().includes(q) ||
      drug.category.toLowerCase().includes(q) ||
      drug.commonBrands.some(b => b.toLowerCase().includes(q)) ||
      drug.strengths.some(s => s.toLowerCase().includes(q))
  );
}
