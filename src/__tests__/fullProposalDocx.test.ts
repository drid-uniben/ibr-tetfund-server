import mammoth from 'mammoth';
import {
  ExportEntry,
  buildFullProposalsDocx,
  parseExportFields,
  resolveFunding,
  sortEntries,
} from '../utils/fullProposalDocx';

const entry = (over: Partial<ExportEntry> = {}): ExportEntry => ({
  title: 'Alpha',
  name: 'Ada Obi',
  faculty: 'Science',
  department: 'Chemistry',
  score: 70,
  status: 'submitted',
  comments: 'Solid work',
  fundingAmount: null,
  link: 'http://localhost:3000/uploads/documents/a.pdf',
  submittedAt: new Date('2026-01-01'),
  ...over,
});

const text = async (buf: Buffer): Promise<string> =>
  (await mammoth.extractRawText({ buffer: buf })).value;

describe('parseExportFields', () => {
  it('defaults to every field and ignores unknown keys', () => {
    expect(parseExportFields(undefined)).toHaveLength(9);
    expect(parseExportFields('title,bogus,score')).toEqual(['title', 'score']);
    expect(parseExportFields('')).toEqual([]);
  });
});

describe('resolveFunding', () => {
  it('uses award when approved, draft when undecided, none when rejected', () => {
    expect(resolveFunding('approved', 500, 300)).toBe(500);
    expect(resolveFunding('submitted', 500, 300)).toBe(300);
    expect(resolveFunding('submitted', 500, undefined)).toBeNull();
    expect(resolveFunding('rejected', 500, 300)).toBeNull();
  });
});

describe('sortEntries', () => {
  const data = [
    entry({ title: 'b', faculty: 'Science', department: 'Physics', score: 50 }),
    entry({ title: 'a', faculty: 'Arts', department: 'English', score: null }),
    entry({ title: 'c', faculty: 'Science', department: 'Chemistry', score: 90 }),
  ];

  it('sorts by title ascending', () => {
    const r = sortEntries(data, { sort: 'title', thenBy: 'title', order: 'asc' });
    expect(r.map((e) => e.title)).toEqual(['a', 'b', 'c']);
  });

  it('puts unscored entries last in either direction', () => {
    const d = sortEntries(data, { sort: 'score', thenBy: 'title', order: 'desc' });
    expect(d.map((e) => e.score)).toEqual([90, 50, null]);
    const a = sortEntries(data, { sort: 'score', thenBy: 'title', order: 'asc' });
    expect(a.map((e) => e.score)).toEqual([50, 90, null]);
  });

  it('groups by faculty then department', () => {
    const r = sortEntries(data, {
      sort: 'faculty_department',
      thenBy: 'title',
      order: 'asc',
    });
    expect(r.map((e) => e.title)).toEqual(['a', 'c', 'b']);
  });
});

describe('buildFullProposalsDocx', () => {
  const base = { sort: 'title', thenBy: 'title', order: 'asc' } as const;

  it('produces a docx containing the selected fields only', async () => {
    const buf = await buildFullProposalsDocx([entry()], {
      ...base,
      fields: ['title', 'score', 'comments', 'link'],
    });
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    const t = await text(buf);
    expect(t).toContain('Alpha');
    expect(t).toContain('70 / 100');
    expect(t).toContain('Solid work');
    expect(t).toContain('a.pdf');
    expect(t).not.toContain('Ada Obi');
    expect(t).not.toContain('Chemistry');
  });

  it('writes faculty headings when grouped and formats funding', async () => {
    const buf = await buildFullProposalsDocx(
      [
        entry({ title: 'One', faculty: 'Arts', fundingAmount: 1500000, status: 'approved' }),
        entry({ title: 'Two', faculty: 'Science' }),
      ],
      {
        sort: 'faculty',
        thenBy: 'title',
        order: 'asc',
        fields: ['title', 'funding', 'status'],
      }
    );
    const t = await text(buf);
    expect(t).toContain('Arts (1)');
    expect(t).toContain('Science (1)');
    expect(t).toContain('1,500,000');
    expect(t).toContain('Not set');
    expect(t.indexOf('Arts (1)')).toBeLessThan(t.indexOf('Science (1)'));
  });
});
