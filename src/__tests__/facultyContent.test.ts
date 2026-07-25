import {
  academicUnits,
  unitTitles,
  facultyDepartmentMap,
  findUnitByTitle,
  findUnitByCode,
  isValidUnit,
  unitHasDepartments,
  isValidUnitDepartment,
} from '../utils/facultyContent';

describe('facultyContent dataset', () => {
  it('contains the expected set of curated academic units', () => {
    expect(academicUnits).toHaveLength(40);
  });

  it('excludes non-academic exam/cert bodies (JUPEB, CBT, CERTIFICATES)', () => {
    const codes = academicUnits.map((u) => u.code);
    expect(codes).not.toContain('JUPEB');
    expect(codes).not.toContain('CBT');
    expect(codes).not.toContain('CERTS');
    expect(codes.some((c) => /_JUP(_AK)?$/.test(c))).toBe(false);
  });

  it('has unique unit titles and unique unit codes', () => {
    const titles = academicUnits.map((u) => u.title);
    const codes = academicUnits.map((u) => u.code);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has no duplicate department titles within a unit', () => {
    for (const u of academicUnits) {
      const deptTitles = u.departments.map((d) => d.title.toLowerCase());
      expect(new Set(deptTitles).size).toBe(deptTitles.length);
    }
  });

  it('only uses the allowed unit types', () => {
    const allowed = ['faculty', 'school', 'college', 'centre', 'institute', 'other'];
    for (const u of academicUnits) expect(allowed).toContain(u.type);
  });

  it('exposes sorted unit titles and a title->departments map', () => {
    expect(unitTitles).toEqual([...unitTitles].sort((a, b) => a.localeCompare(b)));
    expect(Object.keys(facultyDepartmentMap)).toHaveLength(academicUnits.length);
  });
});

describe('facultyContent lookups', () => {
  it('finds a unit by title (case-insensitive, trimmed)', () => {
    expect(findUnitByTitle('Faculty of Physical Sciences')?.code).toBe('PSC');
    expect(findUnitByTitle('  faculty of physical sciences ')?.code).toBe('PSC');
    expect(findUnitByTitle('Nonexistent Faculty')).toBeUndefined();
  });

  it('finds a unit by code', () => {
    expect(findUnitByCode('PSC')?.title).toBe('Faculty of Physical Sciences');
    expect(findUnitByCode('ZZZ')).toBeUndefined();
  });

  it('validates unit titles', () => {
    expect(isValidUnit('Faculty of Physical Sciences')).toBe(true);
    expect(isValidUnit('Hogwarts')).toBe(false);
  });
});

describe('isValidUnitDepartment', () => {
  it('accepts a department that belongs to the unit', () => {
    expect(
      isValidUnitDepartment(
        'Faculty of Physical Sciences',
        'Department of Chemistry'
      )
    ).toBe(true);
  });

  it('rejects a department that does not belong to the unit', () => {
    expect(
      isValidUnitDepartment('Faculty of Physical Sciences', 'Department of Law')
    ).toBe(false);
  });

  it('resolves Computer Science under Faculty of Computing, not Physical Sciences', () => {
    expect(
      isValidUnitDepartment('Faculty of Computing', 'Department of Computer Science')
    ).toBe(true);
    expect(
      isValidUnitDepartment(
        'Faculty of Physical Sciences',
        'Department of Computer Science'
      )
    ).toBe(false);
    expect(findUnitByCode('CIS')?.title).toBe('Faculty of Computing');
  });

  it('rejects an unknown unit', () => {
    expect(isValidUnitDepartment('Fake Faculty', 'Anything')).toBe(false);
  });

  it('allows a missing department only when the unit lists none', () => {
    // Faculty of Physical Sciences HAS departments -> department required
    expect(isValidUnitDepartment('Faculty of Physical Sciences')).toBe(false);

    // Find a real unit with no departments and confirm department is optional
    const emptyUnit = academicUnits.find((u) => u.departments.length === 0);
    expect(emptyUnit).toBeDefined();
    expect(isValidUnitDepartment(emptyUnit!.title)).toBe(true);
    expect(unitHasDepartments(emptyUnit!.title)).toBe(false);
  });
});
