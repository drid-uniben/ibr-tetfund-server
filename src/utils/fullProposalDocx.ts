import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

// Fields the admin can tick/untick in the export dialog.
export const EXPORT_FIELDS = [
  'title',
  'name',
  'faculty',
  'department',
  'score',
  'status',
  'comments',
  'funding',
  'link',
] as const;
export type ExportField = (typeof EXPORT_FIELDS)[number];

export const EXPORT_SORTS = [
  'title',
  'name',
  'score',
  'submittedAt',
  'faculty',
  'faculty_department',
] as const;
export type ExportSort = (typeof EXPORT_SORTS)[number];

export const EXPORT_THEN_BY = ['title', 'name', 'score', 'submittedAt'] as const;
export type ExportThenBy = (typeof EXPORT_THEN_BY)[number];

export interface ExportEntry {
  title: string;
  name: string;
  faculty: string;
  department: string;
  score: number | null;
  status: string; // submitted | under_review | approved | rejected
  comments: string;
  fundingAmount: number | null; // already resolved via resolveFunding()
  link: string;
  submittedAt: Date | null;
}

export interface ExportOptions {
  fields: ExportField[];
  sort: ExportSort;
  thenBy: ExportThenBy;
  order: 'asc' | 'desc';
  generatedAt?: Date;
}

const FIELD_LABELS: Record<ExportField, string> = {
  title: 'Project Title',
  name: 'Researcher',
  faculty: 'Faculty',
  department: 'Department',
  score: 'Score',
  status: 'Decision Status',
  comments: 'Review Comments',
  funding: 'Funding Amount',
  link: 'Full Proposal Document',
};

const SORT_LABELS: Record<string, string> = {
  title: 'Project Title',
  name: 'Researcher Name',
  score: 'Score',
  submittedAt: 'Submission Date',
};

const NONE = '—';
const UNSPECIFIED_FACULTY = 'Unspecified Faculty';
const UNSPECIFIED_DEPARTMENT = 'Unspecified Department';

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * Parse the `fields` query value. Missing => every field. Unknown keys are
 * ignored; an explicit but empty/invalid selection returns [] so the caller
 * can reject it.
 */
export const parseExportFields = (raw: unknown): ExportField[] => {
  if (raw === undefined || raw === null) {
    return [...EXPORT_FIELDS];
  }
  const requested = (Array.isArray(raw) ? raw : String(raw).split(','))
    .map((v) => String(v).trim())
    .filter(Boolean);
  return EXPORT_FIELDS.filter((f) => requested.includes(f));
};

/**
 * Funding shown in the export: the awarded amount once approved; the admin's
 * draft budget while undecided; nothing for a rejection.
 */
export const resolveFunding = (
  status: string,
  awardAmount?: number | null,
  draftAmount?: number | null
): number | null => {
  if (status === 'approved') {
    return typeof awardAmount === 'number' ? awardAmount : null;
  }
  if (status === 'rejected') {
    return null;
  }
  return typeof draftAmount === 'number' ? draftAmount : null;
};

const statusLabel = (status: string): string => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'under_review':
      return 'Under review';
    default:
      return 'Pending decision';
  }
};

const fundingLabel = (entry: ExportEntry): string => {
  if (typeof entry.fundingAmount === 'number') {
    return `₦${entry.fundingAmount.toLocaleString('en-NG')}`;
  }
  return entry.status === 'rejected' ? 'Not funded (rejected)' : 'Not set';
};

const compareEntries = (
  a: ExportEntry,
  b: ExportEntry,
  key: ExportThenBy,
  order: 'asc' | 'desc'
): number => {
  const dir = order === 'asc' ? 1 : -1;
  let result = 0;
  switch (key) {
    case 'title':
      result = collator.compare(a.title, b.title);
      break;
    case 'name':
      result = collator.compare(a.name, b.name);
      break;
    case 'score': {
      // Unscored entries always sink to the bottom, whatever the direction.
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      result = a.score - b.score;
      break;
    }
    case 'submittedAt': {
      const at = a.submittedAt ? a.submittedAt.getTime() : 0;
      const bt = b.submittedAt ? b.submittedAt.getTime() : 0;
      result = at - bt;
      break;
    }
  }
  return result * dir;
};

export const sortEntries = (
  entries: ExportEntry[],
  options: Pick<ExportOptions, 'sort' | 'thenBy' | 'order'>
): ExportEntry[] => {
  const { sort, thenBy, order } = options;
  const grouped = sort === 'faculty' || sort === 'faculty_department';
  const key: ExportThenBy = grouped ? thenBy : (sort as ExportThenBy);

  return [...entries].sort((a, b) => {
    if (grouped) {
      const faculty = collator.compare(
        a.faculty || UNSPECIFIED_FACULTY,
        b.faculty || UNSPECIFIED_FACULTY
      );
      if (faculty !== 0) return faculty;
      if (sort === 'faculty_department') {
        const department = collator.compare(
          a.department || UNSPECIFIED_DEPARTMENT,
          b.department || UNSPECIFIED_DEPARTMENT
        );
        if (department !== 0) return department;
      }
    }
    return (
      compareEntries(a, b, key, order) ||
      collator.compare(a.title, b.title) ||
      collator.compare(a.name, b.name)
    );
  });
};

const describeOrdering = (options: ExportOptions): string => {
  const dirLabel = (key: string): string => {
    if (key === 'score') return options.order === 'desc' ? 'high to low' : 'low to high';
    if (key === 'submittedAt') return options.order === 'desc' ? 'newest first' : 'oldest first';
    return options.order === 'desc' ? 'Z to A' : 'A to Z';
  };
  if (options.sort === 'faculty') {
    return `Grouped by faculty, then ${SORT_LABELS[options.thenBy]} (${dirLabel(options.thenBy)})`;
  }
  if (options.sort === 'faculty_department') {
    return `Grouped by faculty and department, then ${SORT_LABELS[options.thenBy]} (${dirLabel(options.thenBy)})`;
  }
  return `${SORT_LABELS[options.sort]} (${dirLabel(options.sort)})`;
};

const textLines = (text: string): TextRun[] =>
  text.split(/\r?\n/).map(
    (line, i) => new TextRun({ text: line, break: i === 0 ? 0 : 1, size: 21 })
  );

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

const valueCell = (field: ExportField, entry: ExportEntry): TableCell => {
  let children: Paragraph[];
  switch (field) {
    case 'link':
      children = [
        new Paragraph({
          children: entry.link ? [
            new ExternalHyperlink({
              link: entry.link,
              children: [
                new TextRun({
                  text: entry.link,
                  color: '0563C1',
                  underline: {},
                  size: 21,
                }),
              ],
            }),
          ] : [new TextRun({ text: NONE, size: 21 })],
        }),
      ];
      break;
    case 'comments':
      children = [new Paragraph({ children: textLines(entry.comments || NONE) })];
      break;
    default: {
      let text = NONE;
      if (field === 'name') text = entry.name || NONE;
      if (field === 'faculty') text = entry.faculty || NONE;
      if (field === 'department') text = entry.department || NONE;
      if (field === 'score') {
        text = entry.score === null ? 'Not scored' : `${entry.score} / 100`;
      }
      if (field === 'status') text = statusLabel(entry.status);
      if (field === 'funding') text = fundingLabel(entry);
      children = [new Paragraph({ children: [new TextRun({ text, size: 21 })] })];
    }
  }
  return new TableCell({
    width: { size: 75, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children,
  });
};

const labelCell = (field: ExportField): TableCell =>
  new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    shading: { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: FIELD_LABELS[field], bold: true, size: 21 })],
      }),
    ],
  });

const entryBlock = (
  entry: ExportEntry,
  index: number,
  fields: ExportField[]
): (Paragraph | Table)[] => {
  const heading = fields.includes('title') ? `${index}. ${entry.title || 'Untitled proposal'}` : `Proposal ${index}`;
  const rowFields = fields.filter((f) => f !== 'title');

  const blocks: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      keepNext: true,
      spacing: { before: 280, after: 100 },
      children: [new TextRun({ text: heading, bold: true })],
    }),
  ];

  if (rowFields.length > 0) {
    blocks.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rowFields.map(
          (field) =>
            new TableRow({
              cantSplit: field !== 'comments',
              children: [labelCell(field), valueCell(field, entry)],
            })
        ),
      })
    );
  }
  return blocks;
};

export const buildFullProposalsDocx = async (
  entries: ExportEntry[],
  options: ExportOptions
): Promise<Buffer> => {
  const sorted = sortEntries(entries, options);
  const generatedAt = options.generatedAt ?? new Date();
  const body: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: 'Full Proposal Review Report', bold: true })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `Generated ${generatedAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}  |  ${sorted.length} proposal${sorted.length === 1 ? '' : 's'}`,
          color: '595959',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Ordered by: ${describeOrdering(options)}`, color: '595959' }),
      ],
    }),
  ];

  let counter = 0;
  let lastFaculty: string | null = null;
  let lastDepartment: string | null = null;
  const groupByFaculty =
    options.sort === 'faculty' || options.sort === 'faculty_department';

  for (const entry of sorted) {
    if (groupByFaculty) {
      const faculty = entry.faculty || UNSPECIFIED_FACULTY;
      if (faculty !== lastFaculty) {
        const count = sorted.filter(
          (e) => (e.faculty || UNSPECIFIED_FACULTY) === faculty
        ).length;
        body.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            keepNext: true,
            spacing: { before: 400, after: 120 },
            children: [new TextRun({ text: `${faculty} (${count})`, bold: true })],
          })
        );
        lastFaculty = faculty;
        lastDepartment = null;
      }
      if (options.sort === 'faculty_department') {
        const department = entry.department || UNSPECIFIED_DEPARTMENT;
        if (department !== lastDepartment) {
          body.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              keepNext: true,
              spacing: { before: 240, after: 80 },
              children: [new TextRun({ text: department, bold: true })],
            })
          );
          lastDepartment = department;
        }
      }
    }
    counter += 1;
    body.push(...entryBlock(entry, counter, options.fields));
  }

  const doc = new Document({
    creator: 'IBR TETFund Review System',
    title: 'Full Proposal Review Report',
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '7F7F7F',
                  }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });

  return Packer.toBuffer(doc);
};
