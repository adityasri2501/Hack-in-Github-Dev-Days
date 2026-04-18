// api/triage.js — POST /api/triage
const express = require('express');
const router = express.Router();
const { callClaude } = require('./shared');

router.post('/', async (req, res) => {
  const { symptoms, profile = {}, location = {}, language = 'en' } = req.body;

  if (!symptoms) return res.status(400).json({ error: 'Symptoms required' });

  const city = location?.city || 'Mumbai';
  const country = location?.country || 'India';
  const langName = langCode(language);
  const allergies = (profile.allergies || []).map(a => a.name || a).join(', ') || 'None';
  const medications = (profile.medications || []).map(m => m.name || m).join(', ') || 'None';

  const systemPrompt = `You are MediRoute — an emergency healthcare navigator for international tourists.

TOURIST CONTEXT:
- Current location: ${city}, ${country}
- Tourist's language: ${langName}
- Known allergies: ${allergies}
- Current medications: ${medications}

SEVERITY CLASSIFICATION RULES:
- CRITICAL: chest pain, difficulty breathing, stroke symptoms, severe bleeding, loss of consciousness, suspected anaphylaxis → Route to ER. Always first.
- URGENT: fever above 39°C, moderate-to-severe pain, repeated vomiting, suspected fracture, severe headache → Specialist or urgent care.
- NON-URGENT: mild cold, minor rash, general fatigue, mild ache → GP or walk-in.

MANDATORY RULE: If CRITICAL, ER recommendation must appear first regardless of any other factor.

RESPOND IN THIS JSON FORMAT ONLY (no markdown, no preamble):
{
  "severity": "CRITICAL|URGENT|NON-URGENT",
  "specialist_needed": "Cardiologist|General Physician|...",
  "reasoning": "One clear sentence in ${langName}",
  "emergency_action": "Only if CRITICAL: exact steps in ${langName}",
  "disclaimer": "Call 112 immediately if life-threatening. MediRoute provides navigation guidance only, not medical advice."
}`;

  try {
    const text = await callClaude(symptoms, 600, systemPrompt);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch (e) {
    // Smart fallback
    res.json(mockTriage(symptoms, langName));
  }
});

function mockTriage(symptoms, lang) {
  const s = symptoms.toLowerCase();
  if (s.includes('chest') || s.includes('breath') || s.includes('stroke') || s.includes('unconscious') || s.includes('bleed')) {
    return {
      severity: 'CRITICAL',
      specialist_needed: 'Emergency Medicine',
      reasoning: 'Chest or breathing symptoms require immediate emergency evaluation.',
      emergency_action: 'Call 112 immediately. Do not wait. If possible, have someone drive you to the nearest ER.',
      disclaimer: 'Call 112 immediately if life-threatening. MediRoute provides navigation guidance only, not medical advice.'
    };
  }
  if (s.includes('fever') || s.includes('vomit') || s.includes('fracture') || s.includes('break') || s.includes('severe') || s.includes('pain')) {
    return {
      severity: 'URGENT',
      specialist_needed: 'General Physician',
      reasoning: 'Your symptoms suggest you need prompt medical attention within a few hours.',
      disclaimer: 'MediRoute provides navigation guidance only, not medical advice.'
    };
  }
  return {
    severity: 'NON-URGENT',
    specialist_needed: 'General Physician',
    reasoning: 'Your symptoms can be evaluated by a general practitioner at a convenient time.',
    disclaimer: 'MediRoute provides navigation guidance only, not medical advice.'
  };
}

function langCode(code) {
  const map = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', ar: 'Arabic', zh: 'Mandarin Chinese', ja: 'Japanese', ru: 'Russian', pt: 'Portuguese', hi: 'Hindi' };
  return map[code] || 'English';
}

module.exports = router;
