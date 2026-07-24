import React, { useState } from 'react';

interface CodeViewerTabProps {
  apiBase: string;
}

type SubTab = 'architecture' | 'routes' | 'controller' | 'services' | 'repository' | 'logger' | 'playground';

export const CodeViewerTab: React.FC<CodeViewerTabProps> = ({ apiBase }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('architecture');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Playground state
  const [testPrompt, setTestPrompt] = useState('Who has the highest GPA in the database?');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [inspectData, setInspectData] = useState<{
    promptSent: string;
    optimizedContext: string;
    systemPrompt: string;
    response: string;
  } | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRunPlayground = async () => {
    if (!testPrompt.trim() || isTesting) return;
    setIsTesting(true);
    setTestResponse(null);

    try {
      const studentsRes = await fetch(`${apiBase}/students`);
      const students = studentsRes.ok ? await studentsRes.json() : [];

      const isDbRelated = ['student', 'gpa', 'grade', 'major', 'email', 'phone', 'class', 'list', 'who', 'show', 'find', 'search', 'how many'].some(k => testPrompt.toLowerCase().includes(k));
      const contextPreview = isDbRelated ? JSON.stringify(students.map((s: any) => ({
        id: s.id,
        name: s.name,
        grade: s.grade,
        gpa: s.gpa,
        major: s.major
      })), null, 2) : 'No student context provided (query is general/unrelated).';

      const sysPromptPreview = `You are a helpful school assistant. Current student records context:\n${contextPreview}\n\nAnswer the user question using the provided context.`;

      const chatRes = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testPrompt }),
      });

      const chatData = await chatRes.json();
      const resText = chatRes.ok ? chatData.response : (chatData.error || 'Error calling backend API');

      setTestResponse(resText);
      setInspectData({
        promptSent: testPrompt,
        optimizedContext: contextPreview,
        systemPrompt: sysPromptPreview,
        response: resText
      });
    } catch (err: any) {
      setTestResponse(`Connection Error: ${err.message || 'Make sure Node.js server is running on port 5000'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const codeSnippets = {
    routes: `// server/src/routes/studentRoutes.js
import express from 'express';
import { studentController } from '../controllers/studentController.js';
import { aiService } from '../services/aiService.js';
import { logError } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, '..', '..', 'error_log');

const router = express.Router();

// 1. Student REST CRUD Routes -> Mapped to Controller Layer
router.get('/students', studentController.getAll);
router.get('/students/:id', studentController.getById);
router.post('/students', studentController.create);
router.put('/students/:id', studentController.update);
router.delete('/students/:id', studentController.delete);

// 2. Logs Endpoint -> Reads backend error_log file
router.get('/logs', async (req, res) => {
  try {
    let content = '';
    try {
      content = await fs.readFile(logFilePath, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    res.json({ logs: content });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// 3. AI Chat Endpoint -> Delegates to AI Service
router.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const response = await aiService.askQuestion(prompt);
    res.json({ response });
  } catch (error) {
    await logError(error.message, 'routes.chat');
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

router.all('/*', (req, res, next) => {
  res.status(404).json({ error: 'Route not found' }); 
  next();
});

export default router;`,

    controller: `// server/src/controllers/studentController.js
import { studentService } from '../services/studentService.js';
import { logError } from '../utils/logger.js';

// Regex Validations for Input Integrity
const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const PHONE_REGEX = /^\\+?[0-9\\s-]{10,15}$/;

export const studentController = {
  // GET /api/students
  async getAll(req, res) {
    try {
      const students = await studentService.getAllStudents();
      res.json(students);
    } catch (error) {
      await logError(error.message, 'studentController.getAll');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // POST /api/students with Validations & Logger
  async create(req, res) {
    try {
      const { name, email, phone, grade, gpa, major } = req.body;

      // 1. Name Validation
      if (!name || name.trim() === '') {
        const msg = 'Validation error: Name is required';
        await logError(msg, 'studentController.create'); // Log to file
        return res.status(400).json({ error: msg });
      }

      // 2. Email Validation
      if (!email || !EMAIL_REGEX.test(email)) {
        const msg = \`Validation error: Invalid email format (\${email})\`;
        await logError(msg, 'studentController.create'); // Log to file
        return res.status(400).json({ error: msg });
      }

      // 3. Phone Validation
      if (!phone || !PHONE_REGEX.test(phone.replace(/[\\s-]/g, ''))) {
        const msg = \`Validation error: Invalid phone format (\${phone}). Must be 10-15 digits.\`;
        await logError(msg, 'studentController.create'); // Log to file
        return res.status(400).json({ error: msg });
      }

      // Pass validated payload to Service Layer
      const newStudent = await studentService.createStudent({
        name, email, phone,
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

  // PUT /api/students/:id
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, grade, gpa, major } = req.body;

      if (email && !EMAIL_REGEX.test(email)) {
        const msg = \`Validation error: Invalid email format (\${email})\`;
        await logError(msg, 'studentController.update');
        return res.status(400).json({ error: msg });
      }

      if (phone && !PHONE_REGEX.test(phone.replace(/[\\s-]/g, ''))) {
        const msg = \`Validation error: Invalid phone format (\${phone}). Must be 10-15 digits.\`;
        await logError(msg, 'studentController.update');
        return res.status(400).json({ error: msg });
      }

      const updated = await studentService.updateStudent(id, { name, email, phone, grade, gpa, major });
      if (!updated) return res.status(404).json({ error: 'Student not found' });
      res.json(updated);
    } catch (error) {
      await logError(error.message, 'studentController.update');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // DELETE /api/students/:id
  async delete(req, res) {
    try {
      const success = await studentService.deleteStudent(req.params.id);
      if (!success) return res.status(404).json({ error: 'Student not found' });
      res.json({ message: 'Student deleted successfully' });
    } catch (error) {
      await logError(error.message, 'studentController.delete');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};`,

    studentService: `// server/src/services/studentService.js
import { studentRepository } from '../repositories/studentRepository.js';

// Business Logic Layer: Orchestrates Data Access Repository Calls
export const studentService = {
  async getAllStudents() {
    return await studentRepository.getAll();
  },

  async getStudentById(id) {
    return await studentRepository.getById(id);
  },

  async createStudent(studentData) {
    // Additional business rules or transformations can happen here
    return await studentRepository.create(studentData);
  },

  async updateStudent(id, studentData) {
    return await studentRepository.update(id, studentData);
  },

  async deleteStudent(id) {
    return await studentRepository.delete(id);
  }
};`,

    aiService: `// server/src/services/aiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { studentRepository } from '../repositories/studentRepository.js';

dotenv.config();

// Initialize SDK
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
let genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Token Context Optimization (Filters student fields to conserve token budget)
const getOptimizedContext = (students, prompt) => {
  const query = prompt.toLowerCase();
  const keywords = ['student', 'gpa', 'grade', 'major', 'email', 'phone', 'class', 'list', 'who', 'show'];
  const isDbQuery = keywords.some(k => query.includes(k));

  if (!isDbQuery) return 'No student context provided (query is general/unrelated).';

  const includeContact = query.includes('email') || query.includes('phone') || query.includes('contact');

  return JSON.stringify(students.map(s => {
    const compact = { id: s.id, name: s.name, grade: s.grade, gpa: s.gpa, major: s.major };
    if (includeContact) {
      compact.email = s.email;
      compact.phone = s.phone;
    }
    return compact;
  }));
};

export const aiService = {
  async askQuestion(prompt) {
    const students = await studentRepository.getAll();

    if (!genAI) {
      return getFallbackResponse(students, prompt);
    }

    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];
    const optimizedContext = getOptimizedContext(students, prompt);
    const systemPrompt = \`You are a helpful school assistant. Current student records context:
\${optimizedContext}

Answer the user question concisely. No filler.\`;

    const fullPrompt = \`\${systemPrompt}\\n\\nUser Question: \${prompt}\`;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        return (await result.response).text();
      } catch (err) {
        continue; // Model failover
      }
    }

    return getFallbackResponse(students, prompt);
  }
};`,

    repository: `// server/src/repositories/studentRepository.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', '..', 'data', 'db.json');

// Low-level Data Access Layer (Reads/Writes to db.json file)
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
    const newStudent = { id: String(Date.now()), ...studentData };
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
};`,

    logger: `// server/src/utils/logger.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, '..', '..', 'error_log');

// Error Logging Utility: Appends timestamped validation & system errors to error_log file
export async function logError(errorMsg, context = '') {
  const timestamp = new Date().toISOString();
  const logEntry = \`[\${timestamp}] \${context ? \`[\${context}] \` : ''}\${errorMsg}\\n\`;

  try {
    let currentLogs = '';
    try {
      currentLogs = await fs.readFile(logFilePath, 'utf8');
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        console.error('Failed to read error_log file:', readError);
      }
    }

    const updatedLogs = currentLogs + logEntry;
    await fs.writeFile(logFilePath, updatedLogs, 'utf8');
  } catch (writeError) {
    console.error('Failed to write to error_log:', writeError);
  }
}`
  };

  return (
    <div className="code-viewer-container">
      {/* Sub navigation bar */}
      <div className="code-subnav">
        <button
          className={`subnav-btn ${activeSubTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('architecture')}
        >
          🏗️ Layered Architecture Overview
        </button>
        <button
          className={`subnav-btn ${activeSubTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('routes')}
        >
          🔌 1. Route Layer (`studentRoutes.js`)
        </button>
        <button
          className={`subnav-btn ${activeSubTab === 'controller' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('controller')}
        >
          🎮 2. Controller & Validations (`studentController.js`)
        </button>
        <button
          className={`subnav-btn ${activeSubTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('services')}
        >
          ⚡ 3. Service Layer (`studentService` & `aiService`)
        </button>
        <button
          className={`subnav-btn ${activeSubTab === 'repository' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('repository')}
        >
          💾 4. Repository & Database (`studentRepository.js`)
        </button>
        <button
          className={`subnav-btn ${activeSubTab === 'logger' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('logger')}
        >
          📜 5. Error Logger (`logger.js`)
        </button>
        <button
          className={`subnav-btn ${activeSubTab === 'playground' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('playground')}
        >
          🧪 Live AI & API Playground
        </button>
      </div>

      {/* Content Panes */}
      <div className="code-pane-content">
        {/* Architecture Tab */}
        {activeSubTab === 'architecture' && (
          <div className="guide-card">
            <h2 className="guide-title">Enterprise Node.js Architecture Breakdown</h2>
            <p className="guide-description">
              The backend follows a 3-Tier Layered Design Pattern (<strong>Controller ➔ Service ➔ Repository</strong>) coupled with strict input validations, centralized file logging, and AI token optimization.
            </p>

            <div className="architecture-diagram">
              <div className="arch-step">
                <div className="step-badge">Tier 1</div>
                <div className="step-box">
                  <h4>🔌 Route & Controller</h4>
                  <p>Express routes receive HTTP requests. Controllers run regex validations for emails/phones & handle bad inputs.</p>
                  <span className="mono-tag">studentController.js</span>
                </div>
              </div>

              <div className="arch-arrow">➔</div>

              <div className="arch-step">
                <div className="step-badge">Tier 2</div>
                <div className="step-box">
                  <h4>⚡ Service Layer</h4>
                  <p>Contains core business logic & AI context optimization. Interacts with Gemini SDK or fallback engine.</p>
                  <span className="mono-tag">studentService.js & aiService.js</span>
                </div>
              </div>

              <div className="arch-arrow">➔</div>

              <div className="arch-step">
                <div className="step-badge">Tier 3</div>
                <div className="step-box">
                  <h4>💾 Repository Layer</h4>
                  <p>Encapsulates filesystem I/O (`db.json`), isolating database operations from rest of app.</p>
                  <span className="mono-tag">studentRepository.js</span>
                </div>
              </div>

              <div className="arch-arrow">➔</div>

              <div className="arch-step">
                <div className="step-badge">Utility</div>
                <div className="step-box">
                  <h4>📜 Logger Utility</h4>
                  <p>Captures failed validation logs & runtime errors into timestamped <code>error_log</code> file.</p>
                  <span className="mono-tag">logger.js</span>
                </div>
              </div>
            </div>

            <div className="key-concepts-grid">
              <div className="concept-card">
                <div className="concept-icon">🛡️</div>
                <h3>Input Validations</h3>
                <p>Controller validates incoming request bodies with regex (e.g. <code>EMAIL_REGEX</code> and <code>PHONE_REGEX</code>) before calling service logic.</p>
              </div>

              <div className="concept-card">
                <div className="concept-icon">📜</div>
                <h3>File Logging</h3>
                <p>Whenever a validation fails or internal error occurs, <code>logError()</code> writes timestamped log entries to <code>server/error_log</code>.</p>
              </div>

              <div className="concept-card">
                <div className="concept-icon">🧠</div>
                <h3>AI Service Integration</h3>
                <p>Gemini AI API requests are handled inside <code>aiService.js</code>, using <code>studentRepository.getAll()</code> to inject student database context into prompts.</p>
              </div>

              <div className="concept-card">
                <div className="concept-icon">💾</div>
                <h3>Decoupled Repository</h3>
                <p>If you swap `db.json` with MongoDB or PostgreSQL tomorrow, only <code>studentRepository.js</code> needs to be changed!</p>
              </div>
            </div>
          </div>
        )}

        {/* 1. Routes */}
        {activeSubTab === 'routes' && (
          <div className="guide-card">
            <div className="code-header-bar">
              <div>
                <h3>1. Route Layer Definition</h3>
                <p>Location: <code>server/src/routes/studentRoutes.js</code></p>
              </div>
              <button className="btn-copy" onClick={() => handleCopy(codeSnippets.routes, 'routes')}>
                {copiedCode === 'routes' ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
            <pre className="code-block"><code>{codeSnippets.routes}</code></pre>
          </div>
        )}

        {/* 2. Controller & Validations */}
        {activeSubTab === 'controller' && (
          <div className="guide-card">
            <div className="code-header-bar">
              <div>
                <h3>2. Controller Layer with Validations & Error Logging</h3>
                <p>Location: <code>server/src/controllers/studentController.js</code></p>
              </div>
              <button className="btn-copy" onClick={() => handleCopy(codeSnippets.controller, 'controller')}>
                {copiedCode === 'controller' ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
            <pre className="code-block"><code>{codeSnippets.controller}</code></pre>
          </div>
        )}

        {/* 3. Services */}
        {activeSubTab === 'services' && (
          <div className="guide-card">
            <div className="code-header-bar">
              <div>
                <h3>3. Business Service Layer (`studentService` & `aiService`)</h3>
                <p>Locations: <code>server/src/services/studentService.js</code> & <code>server/src/services/aiService.js</code></p>
              </div>
              <button className="btn-copy" onClick={() => handleCopy(codeSnippets.aiService, 'aiService')}>
                {copiedCode === 'aiService' ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
            <h4 style={{ color: 'white', marginTop: '16px' }}>A. Student Business Service:</h4>
            <pre className="code-block"><code>{codeSnippets.studentService}</code></pre>
            <h4 style={{ color: 'white', marginTop: '24px' }}>B. AI Generative Service with Context Optimization:</h4>
            <pre className="code-block"><code>{codeSnippets.aiService}</code></pre>
          </div>
        )}

        {/* 4. Repository */}
        {activeSubTab === 'repository' && (
          <div className="guide-card">
            <div className="code-header-bar">
              <div>
                <h3>4. Data Access Repository Layer</h3>
                <p>Location: <code>server/src/repositories/studentRepository.js</code></p>
              </div>
              <button className="btn-copy" onClick={() => handleCopy(codeSnippets.repository, 'repository')}>
                {copiedCode === 'repository' ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
            <pre className="code-block"><code>{codeSnippets.repository}</code></pre>
          </div>
        )}

        {/* 5. Logger */}
        {activeSubTab === 'logger' && (
          <div className="guide-card">
            <div className="code-header-bar">
              <div>
                <h3>5. Error Logger Utility</h3>
                <p>Location: <code>server/src/utils/logger.js</code></p>
              </div>
              <button className="btn-copy" onClick={() => handleCopy(codeSnippets.logger, 'logger')}>
                {copiedCode === 'logger' ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
            <pre className="code-block"><code>{codeSnippets.logger}</code></pre>
          </div>
        )}

        {/* 6. Playground */}
        {activeSubTab === 'playground' && (
          <div className="guide-card">
            <h2 className="guide-title">🧪 Interactive AI Prompt Inspector & Tester</h2>
            <p className="guide-description">
              Test prompts in real-time and inspect the exact prompt structure, token-optimized student context, and raw response returned from the server!
            </p>

            <div className="playground-quick-prompts">
              <span style={{ fontSize: '13px', color: '#9ca3af', alignSelf: 'center' }}>Preset Prompts:</span>
              <button className="btn-preset" onClick={() => setTestPrompt('Who has the highest GPA in the database?')}>
                🏆 Top GPA Student
              </button>
              <button className="btn-preset" onClick={() => setTestPrompt('How many computer science or engineering students are there?')}>
                📊 Count by Major
              </button>
              <button className="btn-preset" onClick={() => setTestPrompt('Give me a brief summary of all registered students.')}>
                📝 Database Summary
              </button>
            </div>

            <div className="playground-input-row">
              <input
                type="text"
                className="playground-input"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter prompt to test..."
              />
              <button className="btn-primary" onClick={handleRunPlayground} disabled={isTesting}>
                {isTesting ? '⚡ Generating...' : '🚀 Test Prompt'}
              </button>
            </div>

            {testResponse && (
              <div className="test-results-wrapper">
                <div className="test-response-card">
                  <h4>🤖 AI Response:</h4>
                  <div className="response-box">{testResponse}</div>
                </div>

                {inspectData && (
                  <div className="inspection-grid">
                    <div className="inspect-card">
                      <div className="inspect-title">📥 Database Context Prepared by Optimizer</div>
                      <pre className="inspect-code"><code>{inspectData.optimizedContext}</code></pre>
                    </div>

                    <div className="inspect-card">
                      <div className="inspect-title">✉️ Full System Prompt Constructed</div>
                      <pre className="inspect-code"><code>{inspectData.systemPrompt}</code></pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
