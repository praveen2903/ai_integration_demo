import { useState, useEffect } from 'react';
import './App.css';
import { StudentCard } from './components/StudentCard';
import { StudentFormModal } from './components/StudentFormModal';
import { AiAssistant } from './components/AiAssistant';
import { LogViewer } from './components/LogViewer';
import { CodeViewerTab } from './components/CodeViewerTab';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  gpa: string;
  major: string;
}

interface ChatMessage {
  sender: 'user' | 'assistant' | 'system';
  text: string;
}

type MainTab = 'dashboard' | 'code-guide' | 'logs';

const API_BASE = 'https://ai-integration-demo-thlm.onrender.com/api';

function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // AI Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'assistant', text: 'Hello! I am your AI Student Database assistant. Ask me questions about student metrics or search for records.' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // System Logs states
  const [systemLogs, setSystemLogs] = useState('');

  // Load students & logs initially
  useEffect(() => {
    fetchStudents();
    fetchLogs();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      if (res.ok) {
        const data = await res.json();
        setSystemLogs(data.logs || '');
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  const handleFormSubmit = async (studentData: Omit<Student, 'id'>) => {
    try {
      let res;
      if (editingStudent) {
        res = await fetch(`${API_BASE}/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData),
        });
      } else {
        res = await fetch(`${API_BASE}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData),
        });
      }

      if (res.ok) {
        fetchStudents();
        fetchLogs();
        return null; // success
      } else {
        const errorData = await res.json();
        fetchLogs(); // refresh logs with validation failure
        return errorData.error || 'Server error occurred';
      }
    } catch (err) {
      return 'Failed to connect to the backend server.';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchStudents();
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  const handleSendChatMessage = async (userMsg: string) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsAiLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { sender: 'assistant', text: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'system', text: 'Error interacting with assistant' }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'system', text: 'Failed to connect to AI server.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleTriggerMockValidationError = async () => {
    try {
      await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Invalid Test User',
          email: 'not-an-email',
          phone: '123'
        }),
      });
      fetchLogs();
    } catch (err) {
      console.error('Trigger request failed', err);
    }
  };

  return (
    <div style={{ background: '#0e0f14', color: '#a1a1aa', minHeight: '100vh' }}>
      <header className="app-header">
        <div className="app-title-group">
          <h1>EduCore AI</h1>
          <div className="app-subtitle">Student Database & Interactive AI Integration Workspace</div>
        </div>

        {/* Navigation Tabs */}
        <div className="main-nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            🎓 Dashboard
            <span className="tab-badge">{students.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'code-guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('code-guide')}
          >
            💡 How AI Works & Code Tabs
          </button>
          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📜 Error Logs
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleTriggerMockValidationError}>
            Test Logger
          </button>
          <button className="btn-primary" onClick={handleOpenAddModal}>
            + Add Student
          </button>
        </div>
      </header>

      {/* Main Tab 1: Student Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-container">
          <section className="main-section">
            <div className="glass-card">
              <div className="section-header">
                <h2 style={{ margin: 0, fontSize: '20px', color: 'white' }}>Active Students</h2>
                <span style={{ fontSize: '14px', color: '#71717a' }}>{students.length} Registered</span>
              </div>
              
              {students.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717a' }}>
                  No student records found. Add some to get started.
                </div>
              ) : (
                <div className="student-grid">
                  {students.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <AiAssistant
            chatHistory={chatHistory}
            isAiLoading={isAiLoading}
            onSendMessage={handleSendChatMessage}
          />
        </div>
      )}

      {/* Main Tab 2: Code Viewer & AI Integration Guide */}
      {activeTab === 'code-guide' && (
        <CodeViewerTab apiBase={API_BASE} />
      )}

      {/* Main Tab 3: System Logs */}
      {activeTab === 'logs' && (
        <div style={{ paddingTop: '32px' }}>
          <LogViewer systemLogs={systemLogs} />
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showModal && (
        <StudentFormModal
          editingStudent={editingStudent}
          onSubmit={handleFormSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default App;
