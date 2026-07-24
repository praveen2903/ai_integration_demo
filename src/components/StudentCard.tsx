import React from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  gpa: string;
  major: string;
}

interface StudentCardProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onEdit, onDelete }) => {
  return (
    <div className="glass-card student-card">
      <div className="student-card-header">
        <div>
          <div className="student-name">{student.name}</div>
          <div className="student-major">{student.major}</div>
        </div>
        <div className="student-gpa-badge">GPA {student.gpa}</div>
      </div>
      
      <div className="student-details">
        <div className="detail-row">
          <span className="detail-label">Grade:</span>
          <span className="detail-value">{student.grade}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Email:</span>
          <span className="detail-value">{student.email}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Phone:</span>
          <span className="detail-value">{student.phone}</span>
        </div>
      </div>

      <div className="student-actions">
        <button 
          className="btn-icon edit" 
          title="Edit Student"
          onClick={() => onEdit(student)}
        >
          ✏️
        </button>
        <button 
          className="btn-icon delete" 
          title="Delete Student"
          onClick={() => onDelete(student.id)}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};
