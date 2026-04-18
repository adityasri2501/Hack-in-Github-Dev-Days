// api/drug-check.js — POST /api/drug-interaction
const express = require('express');
const router = express.Router();
const { callClaude } = require('./shared');

router.post('/', async (req, res) => {
  const { newDrug, currentMeds = [], language = 'en' } = req.body;
  if (!newDrug) return res.status(400).json({ error: 'New drug name required' });

  const langMap = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', ar: 'Arabic', zh: 'Mandarin Chinese', ja: 'Japanese', ru: 'Russian', pt: 'Portuguese', hi: 'Hindi' };
  const langName = langMap[language] || 'English';
  const currentMedsList = Array.isArray(currentMeds)
    ? currentMeds.map(m => typeof m === 'string' ? m : `${m.name} ${m.dosage || ''}`).join(', ')
    : currentMeds;

  if (!currentMedsList || currentMedsList.trim() === '') {
    return res.json({
      interaction_found: false,
      severity: 'none',
      warning: null,
      recommendation: `No current medications to check against. Consult your doctor before starting ${newDrug}.`,
      disclaimer: 'Always confirm with your doctor or pharmacist.'
    });
  }

  const prompt = `A tourist is about to take a new medication. Check for dangerous interactions.

New medication: ${newDrug}
Current medications: ${currentMedsList}

Respond in ${langName}. Return ONLY valid JSON (no markdown):
{
  "interaction_found": true or false,
  "severity": "none|mild|moderate|severe",
  "warning": null or "WARNING: [specific risk]. Tell your doctor before taking.",
  "recommendation": "One actionable sentence in ${langName}",
  "disclaimer": "Always confirm with your doctor or pharmacist."
}`;

  try {
    const text = await callClaude(prompt, 400);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch {
    res.json({
      interaction_found: false,
      severity: 'none',
      warning: null,
      recommendation: `Interaction check service temporarily unavailable. Please consult your doctor or pharmacist before taking ${newDrug} with your current medications.`,
      disclaimer: 'Always confirm with your doctor or pharmacist.'
    });
  }
});

module.exports = router;
