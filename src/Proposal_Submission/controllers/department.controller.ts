import { Request, Response } from 'express';
import { academicUnits, findUnitByCode } from '../../utils/facultyContent';

/**
 * Department endpoints, served from the static canonical dataset in
 * utils/facultyContent.ts. A department is identified by its title/code and
 * always carries the title of its parent academic unit.
 */
interface FlatDepartment {
  code: string;
  title: string;
  faculty: string; // parent unit title
}

const allDepartments = (): FlatDepartment[] =>
  academicUnits.flatMap((u) =>
    u.departments.map((d) => ({
      code: d.code,
      title: d.title,
      faculty: u.title,
    }))
  );

class DepartmentController {
  getDepartments = (_req: Request, res: Response): void => {
    res.json(allDepartments());
  };

  getDepartmentByCode = (
    req: Request<{ code: string }>,
    res: Response
  ): void => {
    const dept = allDepartments().find((d) => d.code === req.params.code);
    if (!dept) {
      res.status(404).json({ msg: 'Department not found' });
      return;
    }
    res.json(dept);
  };

  // Departments for a unit, addressed by the unit's code.
  getDepartmentsByFacultyCode = (
    req: Request<{ facultyCode: string }>,
    res: Response
  ): void => {
    const unit = findUnitByCode(req.params.facultyCode);
    if (!unit) {
      res.status(404).json({ msg: 'No departments found for this faculty' });
      return;
    }
    res.json(
      unit.departments.map((d) => ({
        code: d.code,
        title: d.title,
        faculty: unit.title,
      }))
    );
  };
}

export default new DepartmentController();
