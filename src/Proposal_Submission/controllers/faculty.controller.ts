import { Request, Response } from 'express';
import {
  academicUnits,
  findUnitByCode,
  getFacultyDepartmentData,
} from '../../utils/facultyContent';

/**
 * Faculty (academic-unit) endpoints, served from the static canonical dataset
 * in utils/facultyContent.ts — no database collection is involved, so the
 * data can never drift or be orphaned by a re-seed.
 */
class FacultyController {
  // List all academic units (faculties/schools/colleges/centres/institutes).
  getFaculties = (_req: Request, res: Response): void => {
    res.json(
      academicUnits.map((u) => ({
        code: u.code,
        title: u.title,
        type: u.type,
      }))
    );
  };

  // Full nested faculty -> departments structure (single fetch for forms).
  getFacultyDepartmentData = (_req: Request, res: Response): void => {
    res.json({ success: true, data: getFacultyDepartmentData() });
  };

  // Get a single unit (with its departments) by code.
  getFacultyByCode = (req: Request<{ code: string }>, res: Response): void => {
    const unit = findUnitByCode(req.params.code);
    if (!unit) {
      res.status(404).json({ msg: 'Faculty not found' });
      return;
    }
    res.json(unit);
  };
}

export default new FacultyController();
