// api/prescription.js — POST /api/prescription-ocr
const express = require('express');
const router = express.Router();
const { callClaude } = require('./shared');

router.post('/', async (req, res) => {
  const { imageData, profile = {}, language = 'en' } = req.body;

  const langMap = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', ar: 'Arabic', zh: 'Mandarin Chinese', ja: 'Japanese', ru: 'Russian', pt: 'Portuguese', hi: 'Hindi' };
  const langName = langMap[language] || 'English';

  const homeCountry = profile.homeCountry || 'home country';
  const currentMeds = (profile.medications || []).map(m => `${m.name} ${m.dosage}`).join(', ') || 'None';

  // For demo: if imageData is "demo" or we can't do OCR, use mock OCR text
  const isDemoMode = !imageData || imageData === 'demo' || !process.env.GOOGLE_VISION_API_KEY;

  let ocrText = '';

  if (isDemoMode) {
    // Mock OCR result (realistic prescription)
    ocrText = `Dr. Priya Sharma, MD (Cardiology)
Apollo Hospital, Mumbai — NMC: MH2019-00234
Date: ${new Date().toLocaleDateString()}

Rx:
Augmentin 625mg tablets
Sig: 1 tablet BD × 7 days
Take with food. Complete full course.
Avoid alcohol during course.

Crocin 650 (Paracetamol) 
Sig: 1 tablet SOS for fever/pain
Max 4 tablets per day

Omeprazole 20mg
Sig: 1 capsule daily before breakfast

Refill: Not permitted
Follow up in 7 days if no improvement.`;
  } else {
    // Try Google Vision API if key available
    try {
      ocrText = await callGoogleVision(imageData);
    } catch {
      ocrText = 'Prescription image (text extraction unavailable in demo mode)';
    }
  }

  const systemPrompt = `You are a medical translation assistant for international tourists.

TOURIST: Home country: ${homeCountry}, Language: ${langName}
Current medications: ${currentMeds}

PRESCRIPTION TEXT (OCR extracted):
${ocrText}

TASKS:
1. Extract: all drug names, dosages, frequencies, durations, special instructions
2. Translate all fields to ${langName} with medically accurate terminology
3. Find equivalent brand name used in ${homeCountry}
4. Check interactions with current medications
5. Add pronunciation guide for the primary drug name
6. Flag dietary restrictions

If multiple medications are present, focus on the primary/first one.

Return ONLY valid JSON (no markdown, no preamble):
{
  "drug_name_local": "...",
  "drug_name_home_country": "...",
  "generic_name": "...",
  "dosage": "...",
  "frequency": "...",
  "duration": "...",
  "instructions_translated": "...",
  "pronunciation_guide": "...",
  "dietary_restrictions": "...",
  "interaction_warning": null,
  "disclaimer": "Always confirm with your doctor or pharmacist."
}`;

  try {
    const text = await callClaude('Process this prescription', 800, systemPrompt);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch {
    // Fallback mock
    res.json({
      drug_name_local: 'Augmentin 625mg',
      drug_name_home_country: 'Augmentin (same name internationally)',
      generic_name: 'Amoxicillin + Clavulanate',
      dosage: '625mg per tablet',
      frequency: 'Twice daily (BD) — morning and evening',
      duration: '7 days — complete the full course',
      instructions_translated: 'Take one tablet twice daily with food. Avoid alcohol during the course. Do not stop early even if feeling better.',
      pronunciation_guide: 'aw-MOKS-ih-SIL-in + klav-yoo-LAN-ate',
      dietary_restrictions: 'Take with food to prevent stomach upset. Avoid alcohol.',
      interaction_warning: null,
      disclaimer: 'Always confirm with your doctor or pharmacist.'
    });
  }
});

async function callGoogleVision(base64Image) {
  const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  const imageContent = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: imageContent },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
      }]
    })
  });

  const data = await response.json();
  return data.responses?.[0]?.fullTextAnnotation?.text || '';
}

module.exports = router;
