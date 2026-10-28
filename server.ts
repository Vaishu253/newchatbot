import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google Gemini SDK on the server with recommended User-Agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional:
    'You are a polished, highly professional, and courteous AI assistant. Provide articulate, well-structured, clear, and comprehensive responses with formatted bullet points or code blocks where helpful.',
  casual:
    'You are a friendly, warm, conversational AI companion. Keep your replies engaging, approachable, and relaxed, while remaining informative, helpful, and completely accurate.',
  concise:
    'You are an ultra-concise, direct AI assistant. Provide brief, sharp, straight-to-the-point answers with zero fluff or boilerplate. Give only what is necessary to answer the prompt directly.',
};

// Health endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Streaming Chat API using Server-Sent Events (SSE)
app.post('/api/chat/stream', async (req: Request, res: Response): Promise<void> => {
  const { messages, tone = 'professional' } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.',
    });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const selectedTone = tone in TONE_INSTRUCTIONS ? tone : 'professional';
  const systemInstruction = TONE_INSTRUCTIONS[selectedTone];

  try {
    // Format conversation history for Gemini API
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    let responseStream;
    try {
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: selectedTone === 'concise' ? 0.3 : 0.7,
        },
      });
    } catch (initialErr: unknown) {
      console.warn('Primary model error, attempting fallback to gemini-flash-latest:', initialErr);
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-flash-latest',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: selectedTone === 'concise' ? 0.3 : 0.7,
        },
      });
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: unknown) {
    console.error('Error in /api/chat/stream:', err);
    let userMsg = 'Unable to generate response. Please try again.';
    if (err instanceof Error) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error?.message) {
          try {
            const inner = JSON.parse(parsed.error.message);
            userMsg = inner?.error?.message || parsed.error.message;
          } catch {
            userMsg = parsed.error.message;
          }
        } else {
          userMsg = err.message;
        }
      } catch {
        userMsg = err.message;
      }
    }
    res.write(`data: ${JSON.stringify({ error: userMsg })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
