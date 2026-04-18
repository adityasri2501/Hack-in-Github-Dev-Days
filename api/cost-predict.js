// api/cost-predict.js — POST /api/cost-predict
const express = require('express');
const router = express.Router();
const { callClaude } = require('./shared');

router.post('/', async (req, res) => {
  const { specialistType, city = 'Mumbai', insurer = 'None', language = 'en' } = req.body;

  const langMap = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', ar: 'Arabic', zh: 'Mandarin Chinese', ja: 'Japanese', ru: 'Russian', pt: 'Portuguese', hi: 'Hindi' };
  const langName = langMap[language] || 'English';

  const prompt = `A tourist is about to see a ${specialistType || 'General Physician'} in ${city}, India.
Their insurance is: ${insurer}. Respond in ${langName}.

Estimate total visit costs with these components:
- Consultation fee range (typical private hospital tourist rate)
- Common lab tests if applicable to this specialty
- Common pharmacy costs for typical prescription
- Estimated insurance coverage percentage

Return ONLY valid JSON (no markdown, no preamble):
{
  "consultation_range": "₹X–₹Y",
  "lab_range": "₹X–₹Y",
  "pharmacy_range": "₹X–₹Y",
  "total_range": "₹X–₹Y",
  "total_usd": "$X–$Y",
  "insurance_coverage_pct": "~XX%",
  "out_of_pocket_estimate": "₹X–₹Y",
  "note": "One sentence caveat in ${langName}"
}`;

  try {
    const text = await callClaude(prompt, 500);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch {
    res.json(mockCostEstimate(specialistType));
  }
});

function mockCostEstimate(specialist) {
  const base = {
    'Cardiologist': { c: '₹1,200–₹2,500', l: '₹2,000–₹5,000', p: '₹400–₹1,200', t: '₹3,600–₹8,700', u: '$43–$105' },
    'General Physician': { c: '₹500–₹1,200', l: '₹300–₹1,500', p: '₹150–₹600', t: '₹950–₹3,300', u: '$11–$40' },
    'Dermatologist': { c: '₹800–₹1,500', l: '₹0–₹500', p: '₹200–₹800', t: '₹1,000–₹2,800', u: '$12–$34' },
    'Orthopedist': { c: '₹1,000–₹2,000', l: '₹500–₹3,000', p: '₹300–₹1,000', t: '₹1,800–₹6,000', u: '$22–$72' },
  };

  const d = base[specialist] || base['General Physician'];
  return {
    consultation_range: d.c,
    lab_range: d.l,
    pharmacy_range: d.p,
    total_range: d.t,
    total_usd: d.u,
    insurance_coverage_pct: '~65–80%',
    out_of_pocket_estimate: '₹300–₹2,000',
    note: `Estimated costs for ${specialist || 'specialist'} in India. Actual costs may vary by provider and city.`
  };
}

module.exports = router;
