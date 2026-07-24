import express from 'express';
import facultyController from '../controllers/faculty.controller';

const router = express.Router();

// Full nested faculty -> departments structure (single fetch for forms).
router.get('/data', facultyController.getFacultyDepartmentData);
router.get('/', facultyController.getFaculties);
router.get('/:code', facultyController.getFacultyByCode);

export default router;
