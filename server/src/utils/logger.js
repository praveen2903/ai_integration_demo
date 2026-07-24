import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, '..', '..', 'error_log');

export async function logError(errorMsg, context = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${context ? `[${context}] ` : ''}${errorMsg}\n`;

  try {
    let currentLogs = '';
    try {
      currentLogs = await fs.readFile(logFilePath, 'utf8');
    } catch (readError) {
      // File doesn't exist yet, which is fine
      if (readError.code !== 'ENOENT') {
        console.error('Failed to read error_log file:', readError);
      }
    }

    const updatedLogs = currentLogs + logEntry;
    await fs.writeFile(logFilePath, updatedLogs, 'utf8');
  } catch (writeError) {
    console.error('Failed to write to error_log:', writeError);
  }
}
