import { Router } from 'express';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import TestAttempt from '../models/TestAttempt.js';
import { buildSystemPrompt, getMockTestConfig, getExpectedTypes } from '../utils/gradePrompts.js';
import { searchWikipediaImage, injectImage } from '../utils/imageSearch.js';

const router = Router();
let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

let anthropic;
function getAnthropic() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

async function chatWithGroq(systemPrompt, messages, options = {}) {
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await getGroq().chat.completions.create({
    model: options.model || 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: formattedMessages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 4096,
    ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });

  return response.choices[0]?.message?.content || '';
}

async function chatWithClaude(systemPrompt, messages, options = {}) {
  const client = getAnthropic();
  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: options.maxTokens || 4096,
    system: systemPrompt,
    messages: formattedMessages,
    temperature: options.temperature ?? 0.7,
  });

  return response.content[0]?.text || '';
}

async function chatWithAI(systemPrompt, messages, options = {}) {
  if (getAnthropic() && !options.jsonMode) {
    return chatWithClaude(systemPrompt, messages, options);
  }
  return chatWithGroq(systemPrompt, messages, options);
}

async function chatWithGroqVision(systemPrompt, textContent, imageBase64, mimeType) {
  const response = await getGroq().chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: textContent },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content || '';
}

// ---------- CONCEPT EXPLAINER ----------
router.post('/concept-explainer', authMiddleware, async (req, res) => {
  try {
    const { message, sessionId, explanationLevel, subject, chapter } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const systemPrompt = buildSystemPrompt(user.grade, 'concept-explainer', {
      explanationLevel: explanationLevel || 'beginner',
      subject, chapter,
    });

    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new Session({
        userId: req.userId,
        tool: 'concept-explainer',
        title: message.substring(0, 60),
        messages: [],
        metadata: { explanationLevel, subject, chapter },
      });
    }

    session.messages.push({ role: 'user', content: message });

    const [aiResponse, imageData] = await Promise.all([
      chatWithAI(systemPrompt, session.messages),
      user.grade <= 8 ? searchWikipediaImage(message.substring(0, 80)) : Promise.resolve(null),
    ]);

    const finalResponse = injectImage(aiResponse, imageData);

    session.messages.push({ role: 'assistant', content: finalResponse });
    await session.save();

    res.json({ response: finalResponse, sessionId: session._id });
  } catch (err) {
    console.error('Concept explainer error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// ---------- CONCEPT EXPLAINER WITH IMAGE ----------
router.post('/concept-explainer/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { message, sessionId, explanationLevel, subject, chapter } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const systemPrompt = buildSystemPrompt(user.grade, 'concept-explainer', {
      explanationLevel: explanationLevel || 'beginner',
      subject, chapter,
    });

    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    const aiResponse = await chatWithGroqVision(
      systemPrompt,
      message || 'Explain what is shown in this image.',
      imageBase64,
      mimeType
    );

    fs.unlinkSync(req.file.path);

    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new Session({
        userId: req.userId,
        tool: 'concept-explainer',
        title: (message || 'Image question').substring(0, 60),
        messages: [],
      });
    }

    session.messages.push({ role: 'user', content: `[Image uploaded] ${message || ''}` });
    session.messages.push({ role: 'assistant', content: aiResponse });
    await session.save();

    res.json({ response: aiResponse, sessionId: session._id });
  } catch (err) {
    console.error('Image explainer error:', err);
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'AI service error' });
  }
});

// ---------- CONCEPT EXPLAINER WITH FILE ----------
router.post('/concept-explainer/file', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { message, sessionId, explanationLevel, subject, chapter } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let fileContent = '';
    const mime = req.file.mimetype;

    if (mime === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      fileContent = pdfData.text;
    } else if (mime === 'text/plain') {
      fileContent = fs.readFileSync(req.file.path, 'utf-8');
    } else if (mime === 'application/msword' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      fileContent = fs.readFileSync(req.file.path, 'utf-8');
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, TXT, or DOC files.' });
    }

    fs.unlinkSync(req.file.path);

    if (!fileContent.trim()) return res.status(400).json({ error: 'Could not extract text from the file' });

    const systemPrompt = buildSystemPrompt(user.grade, 'concept-explainer', {
      explanationLevel: explanationLevel || 'beginner',
      subject, chapter,
    });

    const userContent = `The student has uploaded a document. Here is the extracted text from the file:\n\n---\n${fileContent.substring(0, 15000)}\n---\n\n${message || 'Please explain the concepts in this document.'}`;

    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new Session({
        userId: req.userId,
        tool: 'concept-explainer',
        title: (message || `File: ${req.file.originalname}`).substring(0, 60),
        messages: [],
        metadata: { explanationLevel, subject, chapter },
      });
    }

    session.messages.push({ role: 'user', content: `[File: ${req.file.originalname}] ${message || ''}` });

    const allMessages = [...session.messages.slice(0, -1), { role: 'user', content: userContent }];
    const aiResponse = await chatWithAI(systemPrompt, allMessages);

    session.messages.push({ role: 'assistant', content: aiResponse });
    await session.save();

    res.json({ response: aiResponse, sessionId: session._id });
  } catch (err) {
    console.error('File explainer error:', err);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: 'AI service error' });
  }
});

// ---------- DOCUMENT SUMMARIZER ----------
router.post('/summarize', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { text, mode, query, sessionId } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let content = text || '';

    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        content = pdfData.text;
      } else if (req.file.mimetype.startsWith('image/')) {
        const imageBuffer = fs.readFileSync(req.file.path);
        const imageBase64 = imageBuffer.toString('base64');
        const systemPrompt = buildSystemPrompt(user.grade, 'document-summarizer', {
          summarizationMode: mode || 'full',
          query,
        });
        const aiResponse = await chatWithGroqVision(
          systemPrompt,
          `${mode === 'search' ? `Find and answer: ${query}` : `Provide a ${mode || 'full'} summary of this document/page.`}`,
          imageBase64,
          req.file.mimetype
        );
        fs.unlinkSync(req.file.path);
        return res.json({ response: aiResponse });
      }
      fs.unlinkSync(req.file.path);
    }

    if (!content) return res.status(400).json({ error: 'No content provided' });

    const systemPrompt = buildSystemPrompt(user.grade, 'document-summarizer', {
      summarizationMode: mode || 'full',
      query,
    });

    const aiResponse = await chatWithAI(systemPrompt, [
      { role: 'user', content: `Document content:\n\n${content.substring(0, 15000)}\n\n${mode === 'search' ? `Question: ${query}` : `Provide a ${mode || 'full'} summary.`}` },
    ]);

    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new Session({
        userId: req.userId,
        tool: 'document-summarizer',
        title: `Summary — ${mode || 'full'}`,
        messages: [],
        metadata: { summarizationMode: mode },
      });
    }
    session.messages.push({ role: 'user', content: `[Document uploaded] Mode: ${mode}` });
    session.messages.push({ role: 'assistant', content: aiResponse });
    await session.save();

    res.json({ response: aiResponse, sessionId: session._id });
  } catch (err) {
    console.error('Summarizer error:', err);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: 'AI service error' });
  }
});

// ---------- PROJECT IDEA GENERATOR ----------
router.post('/project-ideas', authMiddleware, async (req, res) => {
  try {
    const { subject, projectType, topic, sessionId } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const systemPrompt = buildSystemPrompt(user.grade, 'project-generator', {
      subject, projectType, topic, count: 4,
    });

    const aiResponse = await chatWithAI(systemPrompt, [
      { role: 'user', content: `Generate project ideas for ${subject}${topic ? ` on topic: ${topic}` : ''}, project type: ${projectType || 'any'}` },
    ]);

    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new Session({
        userId: req.userId,
        tool: 'project-generator',
        title: `Projects — ${subject}`,
        messages: [],
        metadata: { subject, projectType },
      });
    }
    session.messages.push({ role: 'user', content: `Subject: ${subject}, Type: ${projectType || 'any'}${topic ? `, Topic: ${topic}` : ''}` });
    session.messages.push({ role: 'assistant', content: aiResponse });
    await session.save();

    res.json({ response: aiResponse, sessionId: session._id });
  } catch (err) {
    console.error('Project generator error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// ---------- MOCK TEST GENERATOR ----------
function validateQuestionDiversity(questions, grade) {
  const expectedTypes = getExpectedTypes(grade);
  const typesUsed = new Set(questions.map(q => q.type).filter(Boolean));
  const minTypesRequired = Math.min(3, expectedTypes.length);
  return typesUsed.size >= minTypesRequired;
}

function fixQuestionTypes(questions, grade) {
  const expectedTypes = getExpectedTypes(grade);
  return questions.map(q => {
    if (!q.type || !expectedTypes.includes(q.type)) {
      if (q.options && q.options.length > 0) q.type = 'mcq';
      else if (q.pairs) q.type = 'match-following';
      else if (q.items) q.type = 'sequence-ordering';
      else q.type = 'fill-blank';
    }
    return q;
  });
}

router.post('/mock-test/generate', authMiddleware, async (req, res) => {
  try {
    const { subject, chapters } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const config = getMockTestConfig(user.grade);
    const systemPrompt = buildSystemPrompt(user.grade, 'mock-test', { subject, chapters });

    let questions = [];
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const aiResponse = await chatWithGroq(systemPrompt, [
        { role: 'user', content: `Generate a mock test for ${subject}, chapters: ${chapters?.join(', ') || 'All chapters'}. You MUST use a variety of question types as specified. Return ONLY valid JSON: {"questions": [...]}` },
      ], { jsonMode: true, temperature: attempt === 0 ? 0.8 : 0.9, maxTokens: 8000 });

      try {
        const parsed = JSON.parse(aiResponse);
        questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      } catch {
        const match = aiResponse.match(/\[[\s\S]*\]/);
        questions = match ? JSON.parse(match[0]) : [];
      }

      questions = fixQuestionTypes(questions, user.grade);

      if (validateQuestionDiversity(questions, user.grade)) break;
    }

    res.json({ questions, config });
  } catch (err) {
    console.error('Mock test generation error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// ---------- MOCK TEST SUBMIT ----------
router.post('/mock-test/submit', authMiddleware, async (req, res) => {
  try {
    const { subject, chapters, questions, timeTaken } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const config = getMockTestConfig(user.grade);
    let score = 0;
    const topicAccuracy = {};

    const normalize = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizeList = (s) => normalize(s).split(',').map(x => x.trim()).sort().join(',');

    const gradedQuestions = questions.map(q => {
      let isCorrect = false;
      const type = q.type || 'mcq';
      if (['match-following', 'matrix-match', 'multi-select', 'sequence-ordering'].includes(type)) {
        isCorrect = normalizeList(q.studentAnswer) === normalizeList(q.correctAnswer);
      } else {
        isCorrect = normalize(q.studentAnswer) === normalize(q.correctAnswer);
      }
      if (isCorrect) score++;

      if (!topicAccuracy[q.topic]) topicAccuracy[q.topic] = { correct: 0, total: 0 };
      topicAccuracy[q.topic].total++;
      if (isCorrect) topicAccuracy[q.topic].correct++;

      return { ...q, isCorrect, timeTakenSeconds: q.timeTakenSeconds || 0 };
    });

    const weakAreas = Object.entries(topicAccuracy)
      .filter(([, v]) => v.correct / v.total < 0.5)
      .map(([k]) => k);

    const attempt = await TestAttempt.create({
      userId: req.userId,
      subject,
      chapters: chapters || [],
      grade: user.grade,
      questions: gradedQuestions,
      score,
      totalQuestions: questions.length,
      accuracy: Math.round((score / questions.length) * 100),
      timeTaken,
      timeAllotted: config.totalTime * 60,
      topicWiseAccuracy: topicAccuracy,
      weakAreas,
    });

    res.json({
      testId: attempt._id,
      score,
      totalQuestions: questions.length,
      accuracy: attempt.accuracy,
      topicWiseAccuracy: topicAccuracy,
      weakAreas,
      questions: gradedQuestions,
      timeTaken,
      timeAllotted: config.totalTime * 60,
      subject,
    });
  } catch (err) {
    console.error('Mock test submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- FOCUS AREA ----------
router.post('/focus-area', authMiddleware, async (req, res) => {
  try {
    const { subject, chapter, topic } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const systemPrompt = buildSystemPrompt(user.grade, 'focus-area', { subject, chapter, topic });

    const aiResponse = await chatWithAI(systemPrompt, [
      { role: 'user', content: `Provide complete focus area study material for: ${topic} (Chapter: ${chapter}, Subject: ${subject})` },
    ], { maxTokens: 8000 });

    const session = await Session.create({
      userId: req.userId,
      tool: 'exam-prep',
      title: `Focus: ${topic}`,
      messages: [
        { role: 'user', content: `Focus Area — ${subject} > ${chapter} > ${topic}` },
        { role: 'assistant', content: aiResponse },
      ],
      metadata: { subject, chapter, topic },
    });

    res.json({ response: aiResponse, sessionId: session._id });
  } catch (err) {
    console.error('Focus area error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

export default router;
