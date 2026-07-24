import { studentRepository } from '../repositories/studentRepository.js';

export const studentService = {
  async getAllStudents() {
    return await studentRepository.getAll();
  },

  async getStudentById(id) {
    return await studentRepository.getById(id);
  },

  async createStudent(studentData) {
    return await studentRepository.create(studentData);
  },

  async updateStudent(id, studentData) {
    return await studentRepository.update(id, studentData);
  },

  async deleteStudent(id) {
    return await studentRepository.delete(id);
  }
};
