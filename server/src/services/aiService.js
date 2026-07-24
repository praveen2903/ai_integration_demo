import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { studentRepository } from '../repositories/studentRepository.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
let genAI = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn('GEMINI_API_KEY is not defined in environment variables. Falling back to rule-based mock assistant.');
}

const getOptimizedContext = (students, prompt) => {
  const query = prompt.toLowerCase();

  // 1. Check if the query is a general question unrelated to the database
  const databaseKeywords = ['student', 'gpa', 'grade', 'major', 'email', 'phone', 'class', 'list', 'who', 'show', 'find', 'search', 'how many'];
  const isDatabaseRelated = databaseKeywords.some(keyword => query.includes(keyword));

  if (!isDatabaseRelated) {
    return 'No student context provided (query is general/unrelated).';
  }

  // 2. Check if a specific student is requested
  const mentionedStudents = students.filter(s => 
    query.includes(s.name.toLowerCase()) || 
    query.includes(s.id) ||
    s.name.toLowerCase().split(' ').some(namePart => namePart.length > 2 && query.includes(namePart))
  );

  const targetStudents = mentionedStudents.length > 0 ? mentionedStudents : students;

  // 3. Strip email/phone if contact info is NOT requested to save token space
  const includeContactInfo = query.includes('email') || query.includes('phone') || query.includes('contact') || query.includes('call') || query.includes('reach');

  // 4. Format data compactly (using minimized object keys or simple CSV)
  const formatted = targetStudents.map(s => {
    const compactStudent = {
      id: s.id,
      name: s.name,
      grade: s.grade,
      gpa: s.gpa,
      major: s.major
    };

    if (includeContactInfo) {
      compactStudent.email = s.email;
      compactStudent.phone = s.phone;
    }
    return compactStudent;
  });

  return JSON.stringify(formatted);
};

const getSystemPrompt = (optimizedContext) => {
  return `You are a helpful school assistant. Current student records context (minimized to conserve tokens):
${optimizedContext}

Answer the user question using the provided context. Be highly concise and clear. No verbose filler.`;
};


const getFallbackResponse = (students, prompt) => {
  const query = prompt.toLowerCase();
  const studentCount = students.length;

  if (query.includes('how many student') || query.includes('count') || query.includes('number of student')) {
    return `There are currently ${studentCount} students registered in the database.`;
  }
  if (query.includes('who has') && (query.includes('highest gpa') || query.includes('top student') || query.includes('best gpa'))) {
    if (studentCount === 0) return 'There are no students in the database.';
    const sorted = [...students].sort((a, b) => parseFloat(b.gpa || 0) - parseFloat(a.gpa || 0));
    return `The student with the highest GPA is ${sorted[0].name} with a GPA of ${sorted[0].gpa}.`;
  }
  if (query.includes('list') || query.includes('show all')) {
    if (studentCount === 0) return 'No students are registered yet.';
    return `Here are the registered students:\n` + students.map(s => `- ${s.name} (Grade: ${s.grade}, Major: ${s.major}, GPA: ${s.gpa})`).join('\n');
  }
  // Check for specific student name mentions in query
  const matchedStudent = students.find(s => {
    const fullName = s.name.toLowerCase();
    const firstOrLast = fullName.split(' ');
    return query.includes(fullName) || firstOrLast.some(part => part.length > 2 && query.includes(part));
  });

  if (matchedStudent) {
    return `Student Record Details:\n• Name: ${matchedStudent.name}\n• Grade: ${matchedStudent.grade}\n• GPA: ${matchedStudent.gpa}\n• Major: ${matchedStudent.major}\n• Email: ${matchedStudent.email}\n• Phone: ${matchedStudent.phone}`;
  }


  return `Hello! (Fallback mode - no GEMINI_API_KEY configured). I am your student assistant. 
    You can ask me questions like:
    - "How many students are there?"
    - "Who has the highest GPA?"
    - "List all students"

    Currently, we have ${studentCount} students in our database. Please configure a GEMINI_API_KEY in the backend .env file to enable full generative AI chat!`;
};

export const aiService = {
  async askQuestion(prompt) {
    const students = await studentRepository.getAll();

    if (!genAI) {
      return getFallbackResponse(students, prompt);
    }

    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];
    
    // Perform token conservation filtering
    const optimizedContext = getOptimizedContext(students, prompt);
    const systemPrompt = getSystemPrompt(optimizedContext);
    const fullPrompt = `${systemPrompt}\n\nUser Question: ${prompt}`;

    let lastError = null;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        lastError = error;

        if (error.status === 404 || (error.message && error.message.includes('404')) || (error.message && error.message.includes('not found'))) {
          console.warn(`Model ${modelName} not found. Trying next model...`);
          continue;
        }
        break;
      }
    }

    console.error('All Gemini API model attempts failed. Last error:', lastError);
    return `AI Error: Failed to generate response with configured API key. Fallback response:\n${getFallbackResponse(students, prompt)}`;

  }
};
