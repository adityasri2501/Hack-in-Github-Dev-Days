// api/translate.js — POST /api/translate
const express = require('express');
const router = express.Router();
const { callClaude } = require('./shared');

router.post('/', async (req, res) => {
  const { text, targetLang = 'en', context = '' } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  const langMap = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', ar: 'Arabic', zh: 'Mandarin Chinese', ja: 'Japanese', ru: 'Russian', pt: 'Portuguese', hi: 'Hindi' };
  const langName = langMap[targetLang] || targetLang;

  try {
    const prompt = `Translate the following medical text to ${langName}. 
${context ? `Context: ${context}` : ''}
Return ONLY the translated text, nothing else.

Text to translate:
${text}`;

    const translated = await callClaude(prompt, 500);
    res.json({ translated: translated.trim(), targetLang });
  } catch {
    res.json({ translated: text, targetLang, error: 'Translation service unavailable' });
  }
});

module.exports = router;
