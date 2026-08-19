/**
 * Canonical UNIBEN academic units (faculties, schools, colleges, centres,
 * institutes) and their departments.
 *
 * This is the single, code-reviewed source of truth for faculty/department
 * data. Values are stored on records as the human-readable *title* string —
 * never as a database ObjectId — so re-generating this file never orphans
 * existing user/proposal records. Non-academic exam/certificate bodies
 * (JUPEB subject-combinations, CBT, CERTIFICATES) are intentionally excluded.
 *
 * Generated once from src/scripts/list_of_faculties_and_dept_in_uniben.md and
 * then hand-maintained. Edit here directly to add or correct a unit.
 */

/* eslint-disable max-lines -- pure data file that grows as UNIBEN adds/moves
 * units and departments; the one-entry-per-line style below is intentional
 * for reviewable diffs, so line-count is not a useful quality signal here. */

export type AcademicUnitType =
  | 'faculty'
  | 'school'
  | 'college'
  | 'centre'
  | 'institute'
  | 'other';

export interface AcademicDepartment {
  /** Short stable code, e.g. "PHY". */
  code: string;
  /** Full display title, e.g. "Department of Physics". */
  title: string;
}

export interface AcademicUnit {
  /** Short stable code, e.g. "PSC". */
  code: string;
  /** Full display title, e.g. "Faculty of Physical Sciences". */
  title: string;
  type: AcademicUnitType;
  departments: AcademicDepartment[];
}

export const academicUnits: AcademicUnit[] = [
  {
    code: 'AGR',
    title: 'Faculty of Agriculture',
    type: 'faculty',
    departments: [
      {
        code: 'AEE',
        title: 'Department of Agricultural Economics & Ext. Services',
      },
      { code: 'ANS', title: 'Department of Animal Science' },
      { code: 'CRS', title: 'Department of Crop science' },
      {
        code: 'FIS',
        title: 'Department of Aquaculture and Fisheries Management',
      },
      { code: 'FOD', title: 'Department of Food Science and Nutrition' },
      { code: 'FOW', title: 'Department of Forestry and Wildlife' },
      {
        code: 'FWM',
        title: 'Department of Forest Resources and Wildlife Management',
      },
      { code: 'SOS', title: 'Department of Soil Science' },
    ],
  },
  {
    code: 'ART',
    title: 'Faculty of Arts',
    type: 'faculty',
    departments: [
      { code: 'ENL', title: 'Department of English and Literature' },
      { code: 'FAA', title: 'Department of Fine and Applied Art' },
      { code: 'FOL', title: 'Department of Foreign Languages' },
      { code: 'HIS', title: 'Department of History And International Studies' },
      { code: 'LST', title: 'Department of Linguistics Studies' },
      { code: 'MAC', title: 'Department of Mass Communication' },
      { code: 'PHL', title: 'Department of Philosophy' },
      { code: 'REL', title: 'Department of Religions' },
      { code: 'THR', title: 'Department of Theatre Arts' },
    ],
  },
  {
    code: 'CIS',
    title: 'Faculty of Computing',
    type: 'faculty',
    departments: [
      { code: 'CBS', title: 'Department of Cyber Security' },
      { code: 'CSC', title: 'Department of Computer Science' },
      { code: 'DSC', title: 'Department of Data Science' },
      {
        code: 'ICT',
        title: 'Department of Information and Communication Technology',
      },
      { code: 'INT', title: 'Department of Information Technology' },
      { code: 'SEN', title: 'Department of Software Engineering' },
    ],
  },
  {
    code: 'BCS',
    title: 'School of Basic Clinical Sciences',
    type: 'school',
    departments: [
      { code: 'CHP', title: 'Department of Chemical Pathology' },
      {
        code: 'CPT',
        title: 'Department of Clinical Pharmacology and Therapeutics',
      },
      { code: 'HBS', title: 'Department of Haematology and Blood Transfusion' },
      {
        code: 'MMP',
        title: 'Department of Medical Microbiology and Parasitology',
      },
      {
        code: 'PAF',
        title: 'Department of Pathology (Anatomic and Forensic Pathology)',
      },
    ],
  },
  {
    code: 'BMS',
    title: 'School of Basic Medical Sciences',
    type: 'school',
    departments: [
      { code: 'ANA', title: 'Department of Anatomy' },
      { code: 'MBC', title: 'Department of Medical Biochemistry' },
      { code: 'MLS', title: 'Department of Medical Laboratory Science' },
      { code: 'NSC', title: 'Department of Nursing Sciences' },
      { code: 'PHS', title: 'Department of Physiology' },
      { code: 'PST', title: 'Department of Physiotherapy' },
      { code: 'RAD', title: 'Department of Radiography' },
    ],
  },
  {
    code: 'CED',
    title: 'Centre for Entrepreneurship Development',
    type: 'centre',
    departments: [],
  },
  {
    code: 'CFPDS',
    title: 'Centre for Forensic Programmes and DNA Studies',
    type: 'centre',
    departments: [
      {
        code: 'FPDS',
        title: 'Department of Forensic Programmes and DNA Studies',
      },
    ],
  },
  {
    code: 'CGS',
    title: 'Centre for Gender Studies',
    type: 'centre',
    departments: [],
  },
  {
    code: 'COEGPE',
    title: 'Centre for Excellence in Geosciences and Petroleum Engineering',
    type: 'centre',
    departments: [
      { code: 'COEGLY', title: 'Department of Geology' },
      { code: 'COEGPHY', title: 'Department of Geophysics' },
      { code: 'COEPEE', title: 'Department of Petroleum Engineering' },
    ],
  },
  {
    code: 'COEW',
    title: 'College of Education Warri',
    type: 'college',
    departments: [
      { code: 'COEWCSC', title: 'Department of Computer Science' },
      { code: 'COEWENL', title: 'Department of English and Literature' },
    ],
  },
  {
    code: 'COEWPGD',
    title: 'College of Education Warri PGD',
    type: 'college',
    departments: [],
  },
  {
    code: 'CPGE',
    title: 'College of Petroleum and Gas Engineering, PTI Campus',
    type: 'college',
    departments: [
      {
        code: 'CPP',
        title: 'Department of Chemical and Process Engineering, PTI Campus',
      },
      {
        code: 'EEP',
        title: 'Department of Electric/Electronics Engineering, PTI Campus',
      },
      { code: 'GEP', title: 'Department of Gas Engineering, PTI Campus' },
      {
        code: 'IEP',
        title:
          'Department of Industrial and Environemntal Engineering, PTI, Campus',
      },
      {
        code: 'MEP',
        title: 'Department of Mechanical Engineering, PTI Campus',
      },
      { code: 'PEP', title: 'Department of Petroleum Engineering, PTI Campus' },
    ],
  },
  {
    code: 'DCOEM',
    title: 'College of Education Mosogar (Delta State)',
    type: 'college',
    departments: [],
  },
  {
    code: 'COEMPGD',
    title: 'College of Education Mosogar PGD (COEMPGD)',
    type: 'college',
    departments: [],
  },
  {
    code: 'SOASS',
    title: 'School of Arts and Social Sciences',
    type: 'school',
    departments: [],
  },
  {
    code: 'SOEDU',
    title: 'School of Education',
    type: 'school',
    departments: [],
  },
  {
    code: 'SOSCN',
    title: 'School of Sciences',
    type: 'school',
    departments: [],
  },
  {
    code: 'DEN',
    title: 'School of Dentistry',
    type: 'school',
    departments: [
      { code: 'DPV', title: 'Department of Preventive Dentistry' },
      {
        code: 'ODR',
        title: 'Department of Oral Diagnosis & Maxillofacial Radiology',
      },
      {
        code: 'OMPM',
        title: 'Department of Oral & Maxillofacial Pathology and Medicine',
      },
      {
        code: 'OSP',
        title: 'Department of Oral & Maxillofacial Surgery (OMS)',
      },
      { code: 'ORT', title: 'Department of Orthodontics' },
      { code: 'PAE', title: 'Department of Paedodontics' },
      { code: 'PER', title: 'Department of Periodontics' },
      { code: 'PRO', title: 'Department of Prosthodontics' },
      { code: 'RES', title: 'Department of Restorative Dentistry' },
    ],
  },
  {
    code: 'EDU',
    title: 'Faculty of Education',
    type: 'faculty',
    departments: [
      { code: 'ADT', title: 'Department of Adult & Non Formal Education' },
      {
        code: 'CIT',
        title: 'Department of Curriculum and Instructional Technology',
      },
      { code: 'DEF', title: 'Department of Educational Foundations' },
      { code: 'DEM', title: 'Department of Educational Management' },
      {
        code: 'EECP',
        title:
          'Department of Educational Evaluation and Counselling Psychology',
      },
      {
        code: 'EPCS',
        title: 'Department of Educational Psychology & Curr. Studies',
      },
      {
        code: 'ESM',
        title: 'Department of Educational Studies and Management',
      },
      {
        code: 'HEK',
        title:
          'Department of Health Environmental Education and Human Kinetics',
      },
      { code: 'HKS', title: 'Department of Human Kinetics and Sports Science' },
      {
        code: 'HSE',
        title: 'Department of Health, Safety and Environmental Education',
      },
    ],
  },
  {
    code: 'ENG',
    title: 'Faculty of Engineering',
    type: 'faculty',
    departments: [
      { code: 'AGE', title: 'Department of Agricultural Engineering' },
      { code: 'CHE', title: 'Department of Chemical Engineering' },
      { code: 'CPE', title: 'Department of Computer Engineering' },
      { code: 'CVE', title: 'Department of Civil Engineering' },
      {
        code: 'EEE',
        title: 'Department of Electrical/Electronics Engineering',
      },
      { code: 'GME', title: 'Department of Surveying & Geoinformatics' },
      { code: 'IDE', title: 'Department of Industrial Engineering' },
      { code: 'MAR', title: 'Department of Marine Engineering' },
      {
        code: 'MAT',
        title: 'Department of Materials & Metallurgical Engineering',
      },
      { code: 'MCH', title: 'Department of Mechanical Engineering' },
      { code: 'MTE', title: 'Department of Mechatronics Engineering' },
      { code: 'PEE', title: 'Department of Petroleum Engineering' },
      { code: 'PRE', title: 'Department of Production Engineering' },
      { code: 'STE', title: 'Department of Structural Engineering' },
    ],
  },
  {
    code: 'VTE',
    title: 'Faculty of Vocational and Technical Education',
    type: 'faculty',
    departments: [
      {
        code: 'AED',
        title:
          'Department of Agricultural Science Education and Fine and Applied Arts Education',
      },
      { code: 'BED', title: 'Department of Business Education' },
      {
        code: 'HEE',
        title:
          'Department of Home Economics, Hospitality and Tourism Education',
      },
      {
        code: 'ITE',
        title: 'Department of Industrial and Technical Education',
      },
    ],
  },
  {
    code: 'SLT',
    title: 'Faculty of Science Laboratory Technology',
    type: 'faculty',
    departments: [
      {
        code: 'ACST',
        title: 'Department of Applied Chemical Science Technology',
      },
      {
        code: 'BSLT',
        title: 'Department of Biomedical Science Laboratory Technology',
      },
      {
        code: 'GSLT',
        title: 'Department of Geophysical Science Laboratory Technology',
      },
      {
        code: 'NSLT',
        title: 'Department of Natural Science Laboratory Technology',
      },
    ],
  },
  {
    code: 'MCS',
    title: 'Faculty of Media and Communication Studies',
    type: 'faculty',
    departments: [],
  },
  {
    code: 'NSC',
    title: 'Faculty of Nursing Sciences',
    type: 'faculty',
    departments: [],
  },
  {
    code: 'CERHI',
    title: 'Centre of Excellence in Reproductive Health Innovation',
    type: 'centre',
    departments: [
      { code: 'CHT', title: 'Department of Community Health' },
      { code: 'ECN', title: 'Department of Economics (CERHI)' },
      { code: 'NUR', title: 'Department of Nursing (CERHI)' },
      { code: 'OAG', title: 'Department of Obstetrics and Gynaecology' },
    ],
  },
  {
    code: 'ENV',
    title: 'Faculty of Environmental Sciences',
    type: 'faculty',
    departments: [
      { code: 'ARC', title: 'Department of Architecture' },
      { code: 'ESM', title: 'Department of Estate Management' },
      { code: 'GEM', title: 'Department of Geomatics' },
      { code: 'QSV', title: 'Department of Quantity Surveying' },
      { code: 'URP', title: 'Department of Urban and Regional Planning' },
    ],
  },
  {
    code: 'FLC',
    title: 'French Language Centre',
    type: 'centre',
    departments: [],
  },
  {
    code: 'GST',
    title: 'Office for General Studies',
    type: 'other',
    departments: [{ code: 'GST', title: 'Department of General Studies' }],
  },
  {
    code: 'INE',
    title: 'Institute of Education',
    type: 'institute',
    departments: [],
  },
  {
    code: 'LAW',
    title: 'Faculty of Law',
    type: 'faculty',
    departments: [
      { code: 'BUL', title: 'Department of Business Law' },
      { code: 'CIL', title: 'Department of Commercial Law' },
      {
        code: 'JIL',
        title: 'Department of Jurisprudence and International Law',
      },
      { code: 'LAW', title: 'Department of Law' },
      { code: 'PPL', title: 'Department of Private and Property Law' },
      { code: 'PUL', title: 'Department of Public Law' },
    ],
  },
  {
    code: 'LSC',
    title: 'Faculty of Life Sciences',
    type: 'faculty',
    departments: [
      { code: 'AEB', title: 'Department of Animal and Environmental Biology' },
      { code: 'AGP', title: 'Department of Applied Geophysics' },
      { code: 'BCH', title: 'Department of Biochemistry' },
      { code: 'BOT', title: 'Department of Botany' },
      {
        code: 'EMT',
        title: 'Department of Environmental Management & Toxicology',
      },
      { code: 'EVL', title: 'Department of Enviromental Science' },
      { code: 'MCB', title: 'Department of Microbiology' },
      { code: 'OPT', title: 'Department of Optometry' },
      { code: 'PBB', title: 'Department of Plant Biology and Biotechnology' },
      { code: 'SLT', title: 'Department of Science Laboratory Technology' },
      { code: 'ZOO', title: 'Department of Zoology' },
    ],
  },
  {
    code: 'MED',
    title: 'Faculty of Medicine',
    type: 'faculty',
    departments: [
      { code: 'ANT', title: 'Department of Anatomy' },
      { code: 'ANY', title: 'Department of Anaesthesiology' },
      { code: 'CHH', title: 'Department of Child Health' },
      {
        code: 'COH',
        title: 'Department of Public Health and Community Medicine',
      },
      { code: 'HAE', title: 'Department of Haematology' },
      { code: 'MED', title: 'Department of Medicine' },
      { code: 'MEH', title: 'Department of Mental Health' },
      { code: 'PHS', title: 'Department of Physiology' },
      { code: 'SUR', title: 'Department of Surgery' },
    ],
  },
  {
    code: 'MGS',
    title: 'Faculty of Management Sciences',
    type: 'faculty',
    departments: [
      { code: 'ACC', title: 'Department of Accounting' },
      { code: 'ACT', title: 'Department of Actuarial Science' },
      { code: 'BNK', title: 'Department of Banking and Finance' },
      { code: 'BUS', title: 'Department of Business Administration' },
      { code: 'ENT', title: 'Department of Entrepreneurship' },
      { code: 'FIN', title: 'Department of Finance' },
      { code: 'HRM', title: 'Department of Human Resource Management' },
      { code: 'INS', title: 'Department of Insurance' },
      { code: 'MKT', title: 'Department of Marketing' },
    ],
  },
  {
    code: 'NILS',
    title: 'National Institute for Legislative and Democratic Studies',
    type: 'institute',
    departments: [],
  },
  {
    code: 'PESRC',
    title: 'Petroleum and Energy System Research Centre',
    type: 'centre',
    departments: [],
  },
  {
    code: 'PHA',
    title: 'Faculty of Pharmacy',
    type: 'faculty',
    departments: [
      { code: 'IHCM', title: 'Institute of Herbal and Complimentary Medicine' },
      { code: 'PCG', title: 'Department of Pharmacognosy' },
      { code: 'PCH', title: 'Department of Pharmaceutical Chemistry' },
      {
        code: 'PCN',
        title: 'Department of Clinical Pharmacy & Pharmacy Practice',
      },
      { code: 'PCO', title: 'Department of Pharmacology and Toxicology' },
      {
        code: 'PCT',
        title: 'Department of Pharmaceutics & Pharmaceutical Technology',
      },
      { code: 'PHA', title: 'Department of Pharmacy' },
      { code: 'PHM', title: 'Department of Pharmaceutical Mathematics' },
      {
        code: 'PMB',
        title: 'Department of Pharmaceutical Microbiology and Biotechnology',
      },
    ],
  },
  {
    code: 'PSC',
    title: 'Faculty of Physical Sciences',
    type: 'faculty',
    departments: [
      { code: 'CHM', title: 'Department of Chemistry' },
      { code: 'GLY', title: 'Department of Geology' },
      { code: 'MTH', title: 'Department of Mathematics' },
      { code: 'PHY', title: 'Department of Physics' },
      { code: 'STA', title: 'Department of Statistics' },
    ],
  },
  {
    code: 'SAGMS',
    title: 'St. Albert The Great Major Seminary',
    type: 'other',
    departments: [{ code: 'PABK', title: 'Department of Philosophy (SAGMS)' }],
  },
  {
    code: 'SAS',
    title: 'All Saints Ekpoma',
    type: 'other',
    departments: [{ code: 'PAS', title: 'Department of Philosophy (SAS)' }],
  },
  {
    code: 'SCN',
    title: 'School of Science, PTI Campus',
    type: 'school',
    departments: [
      { code: 'GSP', title: 'Department of Geoscience, PTI Campus' },
      { code: 'MAP', title: 'Department of Mathematics, PTI Campus' },
      { code: 'PPP', title: 'Department of Petrophysics, PTI Campus' },
    ],
  },
  {
    code: 'SPESSE',
    title:
      'Centre for SUSTAINABLE PROCUREMENT, ENVIRONMENTAL & SOCIAL STANDARDS ENHANCEMENT (SPESSE)',
    type: 'centre',
    departments: [{ code: 'SPESSE', title: 'Department of SPESSE' }],
  },
  {
    code: 'SSC',
    title: 'Faculty of Social Sciences',
    type: 'faculty',
    departments: [
      { code: 'ECO', title: 'Department of Economics' },
      {
        code: 'GEO',
        title: 'Department of Geography and Disaster Risk Management',
      },
      { code: 'LIS', title: 'Department of Library and Information Science' },
      {
        code: 'PCR',
        title: 'Department of Peace Studies and Conflict Resolution',
      },
      { code: 'POL', title: 'Department of Political Science' },
      { code: 'PUB', title: 'Department of Public Administration' },
      { code: 'SAA', title: 'Department of Sociology & Anthropology' },
      { code: 'SWK', title: 'Department of Social Work' },
    ],
  },
  {
    code: 'INP',
    title:
      'Institute of Public Administration and Health Services Management (IPAHSM)',
    type: 'institute',
    departments: [],
  },
  {
    code: 'UBITS',
    title:
      'Office for University of Benin Industrial Training and Graded Reports Scheme',
    type: 'other',
    departments: [
      {
        code: 'UBITS',
        title: 'Department of University of Benin Industrial Training Scheme',
      },
    ],
  },
  {
    code: 'VNM',
    title: 'Faculty of Veterinary Medicine',
    type: 'faculty',
    departments: [{ code: 'VNM', title: 'Department of Veterinary Medicine' }],
  },
];

/** Sorted list of all unit titles (for dropdowns). */
export const unitTitles: string[] = academicUnits
  .map((u) => u.title)
  .sort((a, b) => a.localeCompare(b));

/** Map of unit title -> department titles (UBJH-compatible shape). */
export const facultyDepartmentMap: Record<string, string[]> =
  academicUnits.reduce<Record<string, string[]>>((acc, u) => {
    acc[u.title] = u.departments.map((d) => d.title);
    return acc;
  }, {});

/** Raw structured data — used by the API endpoint that feeds the frontend. */
export const getFacultyDepartmentData = (): AcademicUnit[] => academicUnits;

export function findUnitByTitle(title: string): AcademicUnit | undefined {
  return academicUnits.find(
    (u) => u.title.toLowerCase() === title.trim().toLowerCase()
  );
}

export function findUnitByCode(code: string): AcademicUnit | undefined {
  return academicUnits.find((u) => u.code === code);
}

/** True if the given unit title exists. */
export function isValidUnit(title: string): boolean {
  return !!findUnitByTitle(title);
}

/** True if the unit exists and has at least one department. */
export function unitHasDepartments(title: string): boolean {
  const u = findUnitByTitle(title);
  return !!u && u.departments.length > 0;
}

/**
 * Validate a (unit, department) pair. A department is required only when the
 * chosen unit actually has departments; unit-only entries are allowed for
 * units that list none.
 */
export function isValidUnitDepartment(
  unitTitle: string,
  departmentTitle?: string
): boolean {
  const u = findUnitByTitle(unitTitle);
  if (!u) return false;
  if (u.departments.length === 0) return true; // department optional
  if (!departmentTitle) return false;
  return u.departments.some(
    (d) => d.title.toLowerCase() === departmentTitle.trim().toLowerCase()
  );
}
