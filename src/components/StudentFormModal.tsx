import React, { useState, useEffect } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  gpa: string;
  major: string;
}

interface StudentFormModalProps {
  editingStudent: Student | null;
  onSubmit: (studentData: Omit<Student, 'id'>) => Promise<string | null>; // Returns server error string if failed, or null on success
  onClose: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  editingStudent,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('');
  const [gpa, setGpa] = useState('');
  const [major, setMajor] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editingStudent) {
      setName(editingStudent.name);
      setEmail(editingStudent.email);
      setPhone(editingStudent.phone);
      setGrade(editingStudent.grade);
      setGpa(editingStudent.gpa);
      setMajor(editingStudent.major);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setGrade('');
      setGpa('');
      setMajor('');
    }
    setValidationErrors({});
    setServerError('');
  }, [editingStudent]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) errors.name = 'Name is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Invalid email format';
    }

    const normalizedPhone = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(normalizedPhone)) {
      errors.phone = 'Must be between 10 to 15 digits';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const error = await onSubmit({ name, email, phone, grade, gpa, major });
    if (error) {
      setServerError(error);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content">
        <h2 style={{ margin: '0 0 20px', color: 'white' }}>
          {editingStudent ? 'Edit Student Details' : 'Add New Student'}
        </h2>
        
        {serverError && (
          <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Praveen Kumar"
            />
            {validationErrors.name && (
              <div className="validation-error">{validationErrors.name}</div>
            )}
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. praveen@domain.com"
            />
            {validationErrors.email && (
              <div className="validation-error">{validationErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +919876543210 (10-15 digits)"
            />
            {validationErrors.phone && (
              <div className="validation-error">{validationErrors.phone}</div>
            )}
          </div>

          <div className="form-group">
            <label>Grade Level</label>
            <input
              type="text"
              className="form-input"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. 12th Grade"
            />
          </div>

          <div className="form-group">
            <label>GPA</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="4"
              className="form-input"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              placeholder="e.g. 3.8"
            />
          </div>

          <div className="form-group">
            <label>Major / Stream</label>
            <input
              type="text"
              className="form-input"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingStudent ? 'Save Changes' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
