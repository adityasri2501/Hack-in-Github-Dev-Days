// server.js — MediRoute Express Backend
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'null', '*'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Serve static frontend ──────────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/triage', require('./api/triage'));
app.use('/api/doctors', require('./api/doctors'));
app.use('/api/match-doctors', require('./api/match'));
app.use('/api/translate', require('./api/translate'));
app.use('/api/prescription-ocr', require('./api/prescription'));
app.use('/api/chat', require('./api/chat'));
app.use('/api/drug-interaction', require('./api/drug-check'));
app.use('/api/cost-predict', require('./api/cost-predict'));
app.use('/api/notify-contacts', require('./api/notify'));

const dashboardModule = require('./api/doctor-dashboard');
app.use('/api/doctor-dashboard', dashboardModule.router);
app.set('doctorDashboardBroadcast', dashboardModule.broadcastEmergency);

// Generic drug finder (used by pharmacy screen)
app.post('/api/generic-drug', async (req, res) => {
  const { drugName, dosage, homeCountry, language } = req.body;
  const { callClaude } = require('./api/shared');
  try {
    const prompt = `A tourist in India has this prescription drug: ${drugName} ${dosage || ''}.
Their home country is ${homeCountry || 'Unknown'}. Respond in ${language || 'English'}.
1. Name the international generic equivalent
2. Confirm dosage equivalence
3. Give the home-country brand name they would recognize
4. Estimated price comparison: branded vs generic in Indian rupees
5. Any important notes about switching

Return ONLY valid JSON (no markdown, no preamble):
{ "generic_name": "...", "home_brand": "...", "branded_price_inr": 0, "generic_price_inr": 0, "saving_percent": 0, "notes": "..." }`;

    const text = await callClaude(prompt, 600);
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(json);
  } catch (e) {
    res.json({
      generic_name: `Generic ${drugName}`,
      home_brand: drugName,
      branded_price_inr: 250,
      generic_price_inr: 80,
      saving_percent: 68,
      notes: 'Generic equivalent is bioequivalent to the branded version. Consult your pharmacist.'
    });
  }
});

// ── Catch-all: serve index.html for SPA ───────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏥 MediRoute API running on http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  POST /api/triage`);
  console.log(`  GET  /api/doctors`);
  console.log(`  POST /api/match-doctors`);
  console.log(`  POST /api/chat`);
  console.log(`  POST /api/prescription-ocr`);
  console.log(`  POST /api/drug-interaction`);
  console.log(`  POST /api/cost-predict`);
  console.log(`  POST /api/notify-contacts`);
  console.log(`  POST /api/translate`);
  console.log(`  POST /api/generic-drug\n`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — AI features will use smart fallbacks');
  }
});

module.exports = app;
