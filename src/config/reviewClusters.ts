/**
 * Review clusters - the single source of truth for which faculties/units may
 * review each other's proposals.
 *
 * A proposal is only ever reviewed by reviewers from the OTHER members of its
 * submitter's cluster. Used by auto-assign, reassign and reconciliation.
 *
 * ADDING / MOVING A UNIT (2 steps, both in this file):
 *   1. put its exact title (as in utils/facultyContent.ts) in ONE cluster below
 *   2. add a keyword for it in `keywordToFacultyMap` at the bottom
 * `__tests__/reviewClusters.test.ts` fails if any unit in facultyContent.ts has
 * no cluster, so a newly created faculty can't silently break assignment again.
 */
export const REVIEW_CLUSTERS = [
  // Cluster 1
  [
    'Faculty of Agriculture',
    'Faculty of Life Sciences',
    'Faculty of Veterinary Medicine',
    'Faculty of Science Laboratory Technology',
  ],

  // Cluster 2
  [
    'Faculty of Pharmacy',
    'Faculty of Dentistry',
    'Faculty of Medicine',
    'Faculty of Basic Medical Sciences',
    'School of Basic Clinical Sciences',
    'Centre of Excellence in Reproductive Health Innovation',
    'Institute of Child Health',
    'Faculty of Nursing Sciences',
    'Centre for Forensic Programmes and DNA Studies',
  ],

  // Cluster 3
  [
    'Faculty of Management Sciences',
    'Institute of Education',
    'Faculty of Social Sciences',
    'Faculty of Vocational Education',
    'Centre for Entrepreneurship Development',
    'Centre for Gender Studies',
    'National Institute for Legislative and Democratic Studies',
    'Institute of Public Administration and Health Services Management',
    'Centre for SUSTAINABLE PROCUREMENT, ENVIRONMENTAL & SOCIAL STANDARDS ENHANCEMENT',
  ],

  // Cluster 4
  [
    'Faculty of Law',
    'Faculty of Arts',
    'Faculty of Education',
    'Faculty of Media and Communication Studies',
    'French Language Centre',
    'Office for General Studies',
    'St. Albert The Great Major Seminary',
    'All Saints Ekpoma',
  ],

  // Cluster 5
  [
    'Faculty of Engineering',
    'Faculty of Physical Sciences',
    'Faculty of Environmental Sciences',
    'Faculty of Computing',
    'Petroleum and Energy System Research Centre',
    'School of Sciences',
    'School of Science, PTI Campus',
    'Office for University of Benin Industrial Training and Graded Reports Scheme',
  ],
] as const;

export type FacultyTitle = (typeof REVIEW_CLUSTERS)[number][number];

// canonical title -> the other members of its cluster
export const clusterMap = Object.fromEntries(
  REVIEW_CLUSTERS.flatMap((cluster) =>
    cluster.map((title) => [title, cluster.filter((t) => t !== title)])
  )
) as Record<FacultyTitle, FacultyTitle[]>;

// Keyword found in a faculty title -> canonical title.
// Order matters: the FIRST keyword contained in the title wins, so keep the
// original entries where they are and add new ones at the end.
export const keywordToFacultyMap: { [key: string]: FacultyTitle } = {
  Agriculture: 'Faculty of Agriculture',
  'Life Sciences': 'Faculty of Life Sciences',
  'Veterinary Medicine': 'Faculty of Veterinary Medicine',
  Pharmacy: 'Faculty of Pharmacy',
  Dentistry: 'Faculty of Dentistry',
  Medicine: 'Faculty of Medicine',
  'Basic Medical Sciences': 'Faculty of Basic Medical Sciences',
  'Basic Clinical Sciences': 'School of Basic Clinical Sciences',
  'Reproductive Health Innovation':
    'Centre of Excellence in Reproductive Health Innovation',
  'Child Health': 'Institute of Child Health',
  'Management Sciences': 'Faculty of Management Sciences',
  Education: 'Faculty of Education',
  'Social Sciences': 'Faculty of Social Sciences',
  'Vocational Education': 'Faculty of Vocational Education',
  Law: 'Faculty of Law',
  Arts: 'Faculty of Arts',
  'Institute of Education': 'Institute of Education',
  Engineering: 'Faculty of Engineering',
  'Physical Sciences': 'Faculty of Physical Sciences',
  'Environmental Sciences': 'Faculty of Environmental Sciences',

  // Units added later (keywords are deliberately specific: they are also used
  // as case-insensitive regexes to find reviewers, so avoid generic words)
  'Science Laboratory Technology': 'Faculty of Science Laboratory Technology',
  Nursing: 'Faculty of Nursing Sciences',
  Forensic: 'Centre for Forensic Programmes and DNA Studies',
  Entrepreneurship: 'Centre for Entrepreneurship Development',
  'Gender Studies': 'Centre for Gender Studies',
  'Legislative and Democratic':
    'National Institute for Legislative and Democratic Studies',
  'Media and Communication': 'Faculty of Media and Communication Studies',
  'French Language': 'French Language Centre',
  'General Studies': 'Office for General Studies',
  'St. Albert': 'St. Albert The Great Major Seminary',
  'All Saints': 'All Saints Ekpoma',
  Computing: 'Faculty of Computing',
  'Petroleum and Energy': 'Petroleum and Energy System Research Centre',
  'School of Sciences': 'School of Sciences',
  'School of Science, PTI': 'School of Science, PTI Campus',
  'Public Administration':
    'Institute of Public Administration and Health Services Management',
  'SUSTAINABLE PROCUREMENT':
    'Centre for SUSTAINABLE PROCUREMENT, ENVIRONMENTAL & SOCIAL STANDARDS ENHANCEMENT',
  'Industrial Training':
    'Office for University of Benin Industrial Training and Graded Reports Scheme',
};
