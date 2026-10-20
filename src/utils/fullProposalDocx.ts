import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
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
  fundingIsEstimate?: boolean; // true when fundingAmount is the researcher's estimated budget
  link: string;
  submittedAt: Date | null;
}

// Cards = one heading + label/value table per proposal (original layout).
// Table = landscape, one row per proposal, one column per selected field.
export const EXPORT_LAYOUTS = ['cards', 'table'] as const;
export type ExportLayout = (typeof EXPORT_LAYOUTS)[number];

// How the full proposal document is shown: the raw URL, or a short "View" link.
export const EXPORT_LINK_STYLES = ['url', 'view'] as const;
export type ExportLinkStyle = (typeof EXPORT_LINK_STYLES)[number];

export interface ExportOptions {
  fields: ExportField[];
  layout?: ExportLayout; // default 'cards'
  linkStyle?: ExportLinkStyle; // default 'url'
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
 * Funding shown in the export, with where it came from:
 *  - approved: the awarded amount (falls back to the researcher's estimated
 *    budget if no award amount was recorded)
 *  - undecided: the admin's draft budget, else the researcher's estimated budget
 *  - rejected: nothing
 * `isEstimate` is true only when the researcher's estimated budget is used, so
 * the export can label it and nobody mistakes it for an approved amount.
 */
export const resolveFundingWithSource = (
  status: string,
  awardAmount?: number | null,
  draftAmount?: number | null,
  estimatedBudget?: number | null
): { amount: number | null; isEstimate: boolean } => {
  if (status === 'rejected') {
    return { amount: null, isEstimate: false };
  }
  const primary = status === 'approved' ? awardAmount : draftAmount;
  if (typeof primary === 'number') {
    return { amount: primary, isEstimate: false };
  }
  if (typeof estimatedBudget === 'number') {
    return { amount: estimatedBudget, isEstimate: true };
  }
  return { amount: null, isEstimate: false };
};

export const resolveFunding = (
  status: string,
  awardAmount?: number | null,
  draftAmount?: number | null,
  estimatedBudget?: number | null
): number | null =>
  resolveFundingWithSource(status, awardAmount, draftAmount, estimatedBudget)
    .amount;

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
    const formatted = `₦${entry.fundingAmount.toLocaleString('en-NG')}`;
    return entry.fundingIsEstimate ? `${formatted} (Estimated)` : formatted;
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

const linkParagraph = (
  entry: ExportEntry,
  linkStyle: ExportLinkStyle,
  size: number
): Paragraph =>
  new Paragraph({
    children: entry.link
      ? [
          new ExternalHyperlink({
            link: entry.link,
            children: [
              new TextRun({
                text: linkStyle === 'view' ? 'View' : entry.link,
                color: '0563C1',
                underline: {},
                size,
              }),
            ],
          }),
        ]
      : [new TextRun({ text: NONE, size })],
  });

const valueCell = (
  field: ExportField,
  entry: ExportEntry,
  linkStyle: ExportLinkStyle = 'url'
): TableCell => {
  let children: Paragraph[];
  switch (field) {
    case 'link':
      children = [linkParagraph(entry, linkStyle, 21)];
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
  fields: ExportField[],
  linkStyle: ExportLinkStyle = 'url'
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
              children: [labelCell(field), valueCell(field, entry, linkStyle)],
            })
        ),
      })
    );
  }
  return blocks;
};

// ---- Table layout (landscape A4) -----------------------------------------
const LANDSCAPE_PAGE = { width: 11906, height: 16838 }; // portrait dims; docx swaps for landscape
const LANDSCAPE_MARGIN = 720; // 0.5"
const TABLE_WIDTH = LANDSCAPE_PAGE.height - LANDSCAPE_MARGIN * 2; // usable width in twips
const TABLE_FONT = 18; // 9pt
const SN_WEIGHT = 4;

// Relative column weights; normalised over the selected fields.
const COLUMN_WEIGHTS: Record<ExportField, number> = {
  title: 22,
  name: 12,
  faculty: 11,
  department: 11,
  score: 6,
  status: 8,
  comments: 30,
  funding: 10,
  link: 14,
};

export const tableColumnWidths = (fields: ExportField[]): number[] => {
  const weights = [SN_WEIGHT, ...fields.map((f) => COLUMN_WEIGHTS[f])];
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / total) * TABLE_WIDTH));
  // Give any rounding remainder to the last column so the widths sum exactly.
  widths[widths.length - 1] += TABLE_WIDTH - widths.reduce((a, b) => a + b, 0);
  return widths;
};

const tCell = (width: number, children: Paragraph[], header = false): TableCell =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    shading: header ? { type: ShadingType.CLEAR, fill: 'D9E2F3', color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children,
  });

const tText = (text: string, bold = false): Paragraph =>
  new Paragraph({ children: [new TextRun({ text, bold, size: TABLE_FONT })] });

const tableValueCell = (
  field: ExportField,
  entry: ExportEntry,
  width: number,
  linkStyle: ExportLinkStyle
): TableCell => {
  switch (field) {
    case 'title':
      return tCell(width, [tText(entry.title || 'Untitled proposal', true)]);
    case 'link':
      return tCell(width, [linkParagraph(entry, linkStyle, TABLE_FONT)]);
    case 'comments':
      return tCell(
        width,
        (entry.comments || NONE).split(/\r?\n/).map((line) => tText(line))
      );
    case 'name':
      return tCell(width, [tText(entry.name || NONE)]);
    case 'faculty':
      return tCell(width, [tText(entry.faculty || NONE)]);
    case 'department':
      return tCell(width, [tText(entry.department || NONE)]);
    case 'score':
      return tCell(width, [
        tText(entry.score === null ? 'Not scored' : `${entry.score} / 100`),
      ]);
    case 'status':
      return tCell(width, [tText(statusLabel(entry.status))]);
    case 'funding':
      return tCell(width, [tText(fundingLabel(entry))]);
  }
};

// One table: header row (repeats on each page) + one row per entry.
// `startIndex` keeps S/N continuous across faculty/department groups.
const proposalsTable = (
  entries: ExportEntry[],
  startIndex: number,
  fields: ExportField[],
  linkStyle: ExportLinkStyle
): Table => {
  const widths = tableColumnWidths(fields);
  const header = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      tCell(widths[0], [tText('S/N', true)], true),
      ...fields.map((f, i) => tCell(widths[i + 1], [tText(FIELD_LABELS[f], true)], true)),
    ],
  });
  const rows = entries.map(
    (entry, i) =>
      new TableRow({
        children: [
          tCell(widths[0], [tText(String(startIndex + i))]),
          ...fields.map((f, c) => tableValueCell(f, entry, widths[c + 1], linkStyle)),
        ],
      })
  );
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: [header, ...rows],
  });
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

  const layout: ExportLayout = options.layout ?? 'cards';
  const linkStyle: ExportLinkStyle = options.linkStyle ?? 'url';
  const groupByFaculty =
    options.sort === 'faculty' || options.sort === 'faculty_department';

  const facultyHeading = (faculty: string, count: number): Paragraph =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      keepNext: true,
      spacing: { before: 400, after: 120 },
      children: [new TextRun({ text: `${faculty} (${count})`, bold: true })],
    });
  const departmentHeading = (department: string): Paragraph =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      keepNext: true,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: department, bold: true })],
    });

  if (layout === 'table') {
    // Split the sorted list into consecutive runs, one table per run.
    const runs: { faculty?: string; department?: string; entries: ExportEntry[] }[] = [];
    for (const entry of sorted) {
      const faculty = groupByFaculty ? entry.faculty || UNSPECIFIED_FACULTY : undefined;
      const department =
        options.sort === 'faculty_department'
          ? entry.department || UNSPECIFIED_DEPARTMENT
          : undefined;
      const last = runs[runs.length - 1];
      if (last && last.faculty === faculty && last.department === department) {
        last.entries.push(entry);
      } else {
        runs.push({ faculty, department, entries: [entry] });
      }
    }
    let index = 1;
    let lastFaculty: string | undefined;
    for (const run of runs) {
      if (run.faculty !== undefined && run.faculty !== lastFaculty) {
        const count = sorted.filter(
          (e) => (e.faculty || UNSPECIFIED_FACULTY) === run.faculty
        ).length;
        body.push(facultyHeading(run.faculty, count));
        lastFaculty = run.faculty;
      }
      if (run.department !== undefined) body.push(departmentHeading(run.department));
      body.push(proposalsTable(run.entries, index, options.fields, linkStyle));
      // A paragraph between tables stops Word from merging adjacent tables.
      body.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      index += run.entries.length;
    }
  } else {
    let counter = 0;
    let lastFaculty: string | null = null;
    let lastDepartment: string | null = null;
    for (const entry of sorted) {
      if (groupByFaculty) {
        const faculty = entry.faculty || UNSPECIFIED_FACULTY;
        if (faculty !== lastFaculty) {
          const count = sorted.filter(
            (e) => (e.faculty || UNSPECIFIED_FACULTY) === faculty
          ).length;
          body.push(facultyHeading(faculty, count));
          lastFaculty = faculty;
          lastDepartment = null;
        }
        if (options.sort === 'faculty_department') {
          const department = entry.department || UNSPECIFIED_DEPARTMENT;
          if (department !== lastDepartment) {
            body.push(departmentHeading(department));
            lastDepartment = department;
          }
        }
      }
      counter += 1;
      body.push(...entryBlock(entry, counter, options.fields, linkStyle));
    }
  }

  const doc = new Document({
    creator: 'IBR TETFund Review System',
    title: 'Full Proposal Review Report',
    sections: [
      {
        properties:
          layout === 'table'
            ? {
                page: {
                  size: { ...LANDSCAPE_PAGE, orientation: PageOrientation.LANDSCAPE },
                  margin: {
                    top: LANDSCAPE_MARGIN,
                    bottom: LANDSCAPE_MARGIN,
                    left: LANDSCAPE_MARGIN,
                    right: LANDSCAPE_MARGIN,
                  },
                },
              }
            : undefined,
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
