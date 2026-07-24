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

router.get('/students', studentController.getAll);
router.get('/students/:id', studentController.getById);
router.post('/students', studentController.create);
router.put('/students/:id', studentController.update);
router.delete('/students/:id', studentController.delete);

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

router.all('/*', (req, res, next)=> {
  res.status(404).json({ error: 'Route not found' }); 
  next();
})

export default router;
