// api/chat.js — POST /api/chat (streaming)
const express = require('express');
const router = express.Router();
const { streamClaude } = require('./shared');

router.post('/', async (req, res) => {
  const { messages = [], profile = {}, language = 'en' } = req.body;

  const langMap = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', ar: 'Arabic', zh: 'Mandarin Chinese', ja: 'Japanese', ru: 'Russian', pt: 'Portuguese', hi: 'Hindi' };
  const langName = langMap[language] || 'English';

  const profileSummary = profile.name
    ? `Name: ${profile.name}, Blood type: ${profile.bloodGroup || 'Unknown'}, Allergies: ${(profile.allergies || []).map(a => a.name || a).join(', ') || 'None'}, Conditions: ${(profile.conditions || []).join(', ') || 'None'}`
    : 'No profile set';

  const systemPrompt = `You are MediRoute AI — a multilingual healthcare navigation assistant for international tourists in India. You help tourists understand their symptoms, find the right type of doctor, understand prescriptions, and navigate a foreign healthcare system.

RULES:
- Never diagnose. Always navigate.
- Always respond in ${langName}.
- If you detect CRITICAL symptoms (chest pain, stroke signs, severe breathing difficulty, severe bleeding, loss of consciousness), immediately state: "This sounds like a medical emergency. Please call 112 now or tap the SOS button."
- Keep responses concise (under 150 words), calm, and actionable.
- Always end with the disclaimer: "MediRoute provides navigation guidance only. Always consult a qualified doctor for diagnosis and treatment."
- Use simple, clear language. Avoid heavy medical jargon.
- If asked about costs, mention typical ranges in INR.
- If asked about specific doctors, suggest searching on the Doctors screen.

Tourist profile context: ${profileSummary}`;

  // Get the last user message
  const lastMsg = messages[messages.length - 1];
  const userContent = lastMsg?.content || '';

  try {
    await streamClaude(userContent, systemPrompt, res);
  } catch (e) {
    console.error('Chat stream error:', e);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
    }
    res.write(`data: ${JSON.stringify({ text: "I'm here to help! Please describe your health concern and I'll guide you to the right care. (Note: AI service temporarily unavailable — please try again shortly.) MediRoute provides navigation guidance only. Always consult a qualified doctor." })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

module.exports = router;
