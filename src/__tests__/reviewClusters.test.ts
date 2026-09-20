import { academicUnits } from '../utils/facultyContent';
import {
  REVIEW_CLUSTERS,
  clusterMap,
  keywordToFacultyMap,
  FacultyTitle,
} from '../config/reviewClusters';

// Same lookups the assign / reassign / reconciliation controllers perform.
const resolveCanonical = (title: string): FacultyTitle | undefined => {
  const cleaned = title.split('(')[0].trim();
  for (const keyword in keywordToFacultyMap) {
    if (cleaned.includes(keyword)) return keywordToFacultyMap[keyword];
  }
  return undefined;
};

const reviewerFacultyRegex = (canonical: FacultyTitle): RegExp => {
  const keywords = clusterMap[canonical].map((peer) => {
    for (const keyword in keywordToFacultyMap) {
      if (keywordToFacultyMap[keyword] === peer) return keyword;
    }
    return null;
  });
  return new RegExp(
    keywords.filter(Boolean).map((k) => `.*${k}.*`).join('|'),
    'i'
  );
};

const clusterIndexOf = (title: FacultyTitle) =>
  REVIEW_CLUSTERS.findIndex((cluster) => (cluster as readonly string[]).includes(title));

// The five clusters exactly as they were before the 15 new units were added.
const ORIGINAL_CLUSTERS: string[][] = [
  ['Faculty of Agriculture', 'Faculty of Life Sciences', 'Faculty of Veterinary Medicine'],
  [
    'Faculty of Pharmacy',
    'Faculty of Dentistry',
    'Faculty of Medicine',
    'Faculty of Basic Medical Sciences',
    'School of Basic Clinical Sciences',
    'Centre of Excellence in Reproductive Health Innovation',
    'Institute of Child Health',
  ],
  [
    'Faculty of Management Sciences',
    'Institute of Education',
    'Faculty of Social Sciences',
    'Faculty of Vocational Education',
  ],
  ['Faculty of Law', 'Faculty of Arts', 'Faculty of Education'],
  ['Faculty of Engineering', 'Faculty of Physical Sciences', 'Faculty of Environmental Sciences'],
];

const NEW_UNITS: Record<string, number> = {
  'Faculty of Computing': 4,
  'Petroleum and Energy System Research Centre': 4,
  'School of Sciences': 4,
  'School of Science, PTI Campus': 4,
  'Faculty of Nursing Sciences': 1,
  'Centre for Forensic Programmes and DNA Studies': 1,
  'Faculty of Science Laboratory Technology': 0,
  'Centre for Entrepreneurship Development': 2,
  'Centre for Gender Studies': 2,
  'National Institute for Legislative and Democratic Studies': 2,
  'Faculty of Media and Communication Studies': 3,
  'French Language Centre': 3,
  'Office for General Studies': 3,
  'St. Albert The Great Major Seminary': 3,
  'All Saints Ekpoma': 3,
  'Institute of Public Administration and Health Services Management': 2,
  'Centre for SUSTAINABLE PROCUREMENT, ENVIRONMENTAL & SOCIAL STANDARDS ENHANCEMENT': 2,
  'Office for University of Benin Industrial Training and Graded Reports Scheme': 4,
};

describe('review clusters', () => {
  it('every academic unit in facultyContent.ts resolves to a review cluster', () => {
    const unresolved = academicUnits
      .filter((unit) => !resolveCanonical(unit.title))
      .map((unit) => unit.title);

    // If this fails, add the unit to REVIEW_CLUSTERS + keywordToFacultyMap
    expect(unresolved).toEqual([]);
  });

  it.each(Object.entries(NEW_UNITS))('%s resolves to itself in cluster %i', (title, cluster) => {
    expect(resolveCanonical(title)).toBe(title);
    expect(clusterIndexOf(title as FacultyTitle)).toBe(cluster);
    expect(clusterMap[title as FacultyTitle].length).toBeGreaterThan(0);
  });

  it('keeps every original faculty routed to the same peers, plus only new units', () => {
    const newUnitTitles = new Set(Object.keys(NEW_UNITS));

    ORIGINAL_CLUSTERS.forEach((cluster) => {
      cluster.forEach((title) => {
        const expectedOriginalPeers = cluster.filter((t) => t !== title);
        const peers = clusterMap[title as FacultyTitle] as string[];

        expect(peers).toEqual(expect.arrayContaining(expectedOriginalPeers));
        const extras = peers.filter((p) => !expectedOriginalPeers.includes(p));
        extras.forEach((p) => expect(newUnitTitles.has(p)).toBe(true));
      });
    });
  });

  it('every previously-resolving unit still resolves to the same faculty as before', () => {
    // Original keyword order; new keywords are appended so they can't shadow these.
    const original = Object.entries(keywordToFacultyMap).slice(0, 20);
    academicUnits.forEach((unit) => {
      const cleaned = unit.title.split('(')[0].trim();
      const before = original.find(([keyword]) => cleaned.includes(keyword))?.[1];
      if (before) expect(resolveCanonical(unit.title)).toBe(before);
    });
  });

  it('has no unit in two clusters, no self-peers, and symmetric peers', () => {
    const all = REVIEW_CLUSTERS.flat() as string[];
    expect(new Set(all).size).toBe(all.length);

    (Object.keys(clusterMap) as FacultyTitle[]).forEach((a) => {
      expect(clusterMap[a]).not.toContain(a);
      clusterMap[a].forEach((b) => expect(clusterMap[b]).toContain(a));
    });
  });

  it('every cluster member has a keyword and every keyword points at a cluster member', () => {
    const keywordTargets = new Set(Object.values(keywordToFacultyMap));
    (REVIEW_CLUSTERS.flat() as FacultyTitle[]).forEach((title) => {
      expect(keywordTargets.has(title)).toBe(true);
    });
    keywordTargets.forEach((title) => expect(clusterIndexOf(title)).toBeGreaterThanOrEqual(0));
  });

  it('a Faculty of Computing proposal is offered Engineering / Physical / Environmental reviewers', () => {
    const regex = reviewerFacultyRegex('Faculty of Computing');

    expect(regex.test('Faculty of Engineering')).toBe(true);
    expect(regex.test('Faculty of Physical Sciences')).toBe(true);
    expect(regex.test('Faculty of Environmental Sciences')).toBe(true);
    expect(regex.test('Faculty of Computing')).toBe(false); // never its own faculty
    expect(regex.test('Faculty of Law')).toBe(false);
    expect(regex.test('Faculty of Arts')).toBe(false);
  });

  it('reviewers from the new units are only matched for proposals in their own cluster', () => {
    const newTitles = Object.keys(NEW_UNITS) as FacultyTitle[];

    (REVIEW_CLUSTERS.flat() as FacultyTitle[]).forEach((proposalFaculty) => {
      const regex = reviewerFacultyRegex(proposalFaculty);
      newTitles.forEach((reviewerFaculty) => {
        const sameCluster = clusterIndexOf(proposalFaculty) === clusterIndexOf(reviewerFaculty);
        const isSelf = proposalFaculty === reviewerFaculty;
        expect(regex.test(reviewerFaculty)).toBe(sameCluster && !isSelf);
      });
    });
  });
});
