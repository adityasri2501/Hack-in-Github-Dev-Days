// api/match.js — POST /api/match-doctors
const express = require('express');
const router = express.Router();
const { callClaude } = require('./shared');
const fs = require('fs');
const path = require('path');

router.post('/', async (req, res) => {
  const { triageResult, profile = {} } = req.body;

  let doctors = [];
  try {
    doctors = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/doctors.json'), 'utf-8'));
  } catch (e) { return res.json([]); }

  // Pre-filter by specialty
  const specialty = triageResult?.specialist_needed || '';
  let candidates = specialty
    ? doctors.filter(d => d.specialty?.toLowerCase().includes(specialty.toLowerCase().split(' ')[0]))
    : doctors;

  if (candidates.length === 0) candidates = doctors.slice(0, 8);
  candidates = candidates.slice(0, 10);

  const langName = profile.language || 'English';

  const systemPrompt = `You are a doctor recommendation engine for international tourists.
Rank the available doctors and return top 3 matches.

TOURIST PROFILE:
- Nationality: ${profile.nationality || 'Unknown'}
- Language: ${langName}
- Insurance: ${profile.insurance?.insurer || 'None'}
- Specialist needed: ${specialty}
- Max budget (INR): ${profile.preferences?.maxBudget || 5000}

RANKING WEIGHTS:
1. Language match — 30%
2. Insurance acceptance — 25%
3. Tourist review score — 20%
4. Price within budget — 15%
5. Available now — 10%

Return ONLY a valid JSON array of top 3 (no markdown, no preamble):
[{
  "doctor_id": "...",
  "doctor_name": "...",
  "match_score": 0,
  "match_reason": "One sentence in ${langName}",
  "price_display": "₹X–₹Y",
  "insurance_note": "...",
  "language_note": "..."
}]`;

  try {
    const doctorsJson = JSON.stringify(candidates.map(d => ({
      id: d.id, name: d.name, specialty: d.specialty,
      languages: d.languages?.map(l => l.lang),
      insurance: d.insurance_accepted,
      fee_min: d.tourist_consultation_fee_min,
      fee_max: d.tourist_consultation_fee_max,
      review_score: d.tourist_review_score,
      available: d.available_now
    })));

    const text = await callClaude(`AVAILABLE DOCTORS: ${doctorsJson}`, 800, systemPrompt);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const matches = JSON.parse(cleaned);
    res.json(matches);
  } catch {
    // Fallback: return top 3 by review score
    const top3 = candidates
      .sort((a, b) => (b.tourist_review_score || 0) - (a.tourist_review_score || 0))
      .slice(0, 3)
      .map(d => ({
        doctor_id: d.id,
        doctor_name: d.name,
        match_score: Math.round(d.tourist_review_score * 20) || 80,
        match_reason: `Highly rated ${d.specialty} specialist with tourist experience.`,
        price_display: `₹${d.tourist_consultation_fee_min}–₹${d.tourist_consultation_fee_max}`,
        insurance_note: d.insurance_accepted?.join(', ') || 'Check directly',
        language_note: d.languages?.map(l => l.lang).join(', ') || 'English'
      }));
    res.json(top3);
  }
});

module.exports = router;
