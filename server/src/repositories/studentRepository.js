import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', '..', 'data', 'db.json');

async function readDb() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialDb = { students: [] };
      await fs.writeFile(dbPath, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    throw error;
  }
}

async function writeDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export const studentRepository = {
  async getAll() {
    const db = await readDb();
    return db.students || [];
  },

  async getById(id) {
    const students = await this.getAll();
    return students.find((s) => s.id === id);
  },

  async create(studentData) {
    const db = await readDb();
    const newStudent = { id: String(Date.now()), ...studentData};

    db.students = db.students || [];
    db.students.push(newStudent);
    await writeDb(db);
    return newStudent;
  },

  async update(id, studentData) {
    const db = await readDb();
    db.students = db.students || [];
    const index = db.students.findIndex((s) => s.id === id);
    if (index === -1) return null;

    db.students[index] = { ...db.students[index], ...studentData, id };
    
    await writeDb(db);
    return db.students[index];
  },

  async delete(id) {
    const db = await readDb();
    db.students = db.students || [];
    const index = db.students.findIndex((s) => s.id === id);
    if (index === -1) return false;

    db.students.splice(index, 1);
    await writeDb(db);
    return true;
  }
};
