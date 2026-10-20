import mammoth from 'mammoth';
import JSZip from 'jszip';
import {
  ExportEntry,
  buildFullProposalsDocx,
  parseExportFields,
  tableColumnWidths,
  resolveFunding,
  resolveFundingWithSource,
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

  it('falls back to the estimated budget when no amount is set', () => {
    expect(resolveFunding('submitted', undefined, undefined, 900)).toBe(900);
    expect(resolveFunding('submitted', 500, 300, 900)).toBe(300);
    expect(resolveFunding('approved', undefined, 300, 900)).toBe(900);
    expect(resolveFunding('rejected', 500, 300, 900)).toBeNull();
    expect(
      resolveFundingWithSource('submitted', undefined, undefined, 900)
    ).toEqual({ amount: 900, isEstimate: true });
    expect(resolveFundingWithSource('submitted', 500, 300, 900)).toEqual({
      amount: 300,
      isEstimate: false,
    });
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

  it('labels a fallback estimated budget so it is not read as approved', async () => {
    const buf = await buildFullProposalsDocx(
      [entry({ fundingAmount: 2500000, fundingIsEstimate: true })],
      { ...base, fields: ['title', 'funding'] }
    );
    const t = await text(buf);
    expect(t).toContain('₦2,500,000 (Estimated)');
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

const documentXml = async (buf: Buffer): Promise<string> => {
  const zip = await JSZip.loadAsync(buf);
  return zip.file('word/document.xml')!.async('string');
};

describe('table layout', () => {
  const base = { sort: 'title', thenBy: 'title', order: 'asc' } as const;
  const all = ['title', 'name', 'faculty', 'department', 'score', 'status', 'comments', 'funding', 'link'] as const;

  it('column widths sum to the usable landscape width', () => {
    const w = tableColumnWidths([...all]);
    expect(w).toHaveLength(all.length + 1); // + S/N
    expect(w.reduce((a, b) => a + b, 0)).toBe(16838 - 1440);
    expect(tableColumnWidths(['title']).reduce((a, b) => a + b, 0)).toBe(16838 - 1440);
  });

  it('is landscape with a title column and one row per proposal', async () => {
    const buf = await buildFullProposalsDocx(
      [entry({ title: 'Alpha' }), entry({ title: 'Beta', name: 'Bayo' })],
      { ...base, layout: 'table', fields: [...all] }
    );
    const xml = await documentXml(buf);
    expect(xml).toContain('w:orient="landscape"');
    expect(xml).toMatch(/<w:pgSz[^>]*w:w="16838"/);
    expect(xml).toContain('<w:tblHeader'); // header row repeats across pages
    expect((xml.match(/<w:tbl>/g) || []).length).toBe(1);
    expect((xml.match(/<w:tr[ >]/g) || []).length).toBe(3); // header + 2
    const t = await text(buf);
    expect(t).toContain('Project Title');
    expect(t).toContain('S/N');
    expect(t).toContain('Alpha');
    expect(t).toContain('Beta');
  });

  it('only includes ticked fields as columns', async () => {
    const buf = await buildFullProposalsDocx([entry()], {
      ...base,
      layout: 'table',
      fields: ['title', 'score'],
    });
    const t = await text(buf);
    expect(t).toContain('Score');
    expect(t).not.toContain('Researcher');
    expect(t).not.toContain('Ada Obi');
  });

  it('writes one table per faculty with continuous numbering', async () => {
    const buf = await buildFullProposalsDocx(
      [
        entry({ title: 'A1', faculty: 'Arts' }),
        entry({ title: 'S1', faculty: 'Science' }),
        entry({ title: 'A2', faculty: 'Arts' }),
      ],
      { sort: 'faculty', thenBy: 'title', order: 'asc', layout: 'table', fields: ['title'] }
    );
    const xml = await documentXml(buf);
    expect((xml.match(/<w:tbl>/g) || []).length).toBe(2);
    const t = await text(buf);
    expect(t).toContain('Arts (2)');
    expect(t).toContain('Science (1)');
  });

  it('keeps cards layout portrait by default', async () => {
    const buf = await buildFullProposalsDocx([entry()], { ...base, fields: ['title'] });
    expect(await documentXml(buf)).not.toContain('w:orient="landscape"');
  });
});

describe('link style', () => {
  const base = { sort: 'title', thenBy: 'title', order: 'asc', fields: ['title', 'link'] } as const;

  it('shows the full URL by default and a short View link on request', async () => {
    for (const layout of ['cards', 'table'] as const) {
      const full = await text(await buildFullProposalsDocx([entry()], { ...base, fields: [...base.fields], layout }));
      expect(full).toContain('http://localhost:3000/uploads/documents/a.pdf');
      const view = await buildFullProposalsDocx([entry()], { ...base, fields: [...base.fields], layout, linkStyle: 'view' });
      const t = await text(view);
      expect(t).toContain('View');
      expect(t).not.toContain('a.pdf');
      // the hyperlink target is still the real URL
      const rels = await JSZip.loadAsync(view).then((z) => z.file('word/_rels/document.xml.rels')!.async('string'));
      expect(rels).toContain('http://localhost:3000/uploads/documents/a.pdf');
    }
  });
});
