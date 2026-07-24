import { studentService } from '../services/studentService.js';
import { logError } from '../utils/logger.js';

// Simple regex validations
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{10,15}$/;

export const studentController = {
  async getAll(req, res) {
    try {
      const students = await studentService.getAllStudents();
      res.json(students);
    } catch (error) {
      await logError(error.message, 'studentController.getAll');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getById(req, res) {
    try {
      const student = await studentService.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.json(student);
    } catch (error) {
      await logError(error.message, 'studentController.getById');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async create(req, res) {
    try {
      const { name, email, phone, grade, gpa, major } = req.body;

      // Validations
      if (!name || name.trim() === '') {
        const msg = 'Validation error: Name is required';
        await logError(msg, 'studentController.create');
        return res.status(400).json({ error: msg });
      }

      if (!email || !EMAIL_REGEX.test(email)) {
        const msg = `Validation error: Invalid email format (${email})`;
        await logError(msg, 'studentController.create');
        return res.status(400).json({ error: msg });
      }

      if (!phone || !PHONE_REGEX.test(phone.replace(/[\s-]/g, ''))) {
        const msg = `Validation error: Invalid phone format (${phone}). Must be 10-15 digits.`;
        await logError(msg, 'studentController.create');
        return res.status(400).json({ error: msg });
      }

      const newStudent = await studentService.createStudent({
        name,
        email,
        phone,
        grade: grade || 'N/A',
        gpa: gpa || '0.0',
        major: major || 'N/A'
      });

      res.status(201).json(newStudent);
    } catch (error) {
      await logError(error.message, 'studentController.create');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, grade, gpa, major } = req.body;

      // Validations
      if (email && !EMAIL_REGEX.test(email)) {
        const msg = `Validation error: Invalid email format (${email})`;
        await logError(msg, 'studentController.update');
        return res.status(400).json({ error: msg });
      }

      if (phone && !PHONE_REGEX.test(phone.replace(/[\s-]/g, ''))) {
        const msg = `Validation error: Invalid phone format (${phone}). Must be 10-15 digits.`;
        await logError(msg, 'studentController.update');
        return res.status(400).json({ error: msg });
      }

      const updatedStudent = await studentService.updateStudent(id, {
        name,
        email,
        phone,
        grade,
        gpa,
        major
      });

      if (!updatedStudent) {
        return res.status(404).json({ error: 'Student not found' });
      }

      res.json(updatedStudent);
    } catch (error) {
      await logError(error.message, 'studentController.update');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const success = await studentService.deleteStudent(id);
      if (!success) {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.json({ message: 'Student deleted successfully' });
    } catch (error) {
      await logError(error.message, 'studentController.delete');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
