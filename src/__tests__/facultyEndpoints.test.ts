import express from 'express';
import request from 'supertest';
import facultyRoutes from '../Proposal_Submission/routes/faculty.routes';
import departmentRoutes from '../Proposal_Submission/routes/department.routes';
import { academicUnits } from '../utils/facultyContent';

const app = express();
app.use('/faculties', facultyRoutes);
app.use('/departments', departmentRoutes);

describe('GET /faculties', () => {
  it('lists all academic units with code/title/type', async () => {
    const res = await request(app).get('/faculties');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(academicUnits.length);
    expect(res.body[0]).toHaveProperty('code');
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('type');
  });

  it('returns the full nested structure at /faculties/data', async () => {
    const res = await request(app).get('/faculties/data');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(academicUnits.length);
    expect(res.body.data[0]).toHaveProperty('departments');
  });

  it('returns a single unit by code', async () => {
    const res = await request(app).get('/faculties/PSC');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Faculty of Physical Sciences');
    expect(Array.isArray(res.body.departments)).toBe(true);
  });

  it('404s for an unknown code', async () => {
    const res = await request(app).get('/faculties/ZZZ');
    expect(res.status).toBe(404);
  });
});

describe('GET /departments', () => {
  it('lists all departments with their parent faculty title', async () => {
    const res = await request(app).get('/departments');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('faculty');
  });

  it('returns departments for a unit by code', async () => {
    const res = await request(app).get('/departments/by-faculty-code/PSC');
    expect(res.status).toBe(200);
    const titles = res.body.map((d: { title: string }) => d.title);
    expect(titles).toContain('Department of Computer Science');
    for (const d of res.body) {
      expect(d.faculty).toBe('Faculty of Physical Sciences');
    }
  });

  it('404s for a unit code that does not exist', async () => {
    const res = await request(app).get('/departments/by-faculty-code/ZZZ');
    expect(res.status).toBe(404);
  });
});
