// api/doctors.js — GET /api/doctors
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

let doctorsCache = null;

function getDoctors() {
  if (doctorsCache) return doctorsCache;
  try {
    const data = fs.readFileSync(path.join(__dirname, '../data/doctors.json'), 'utf-8');
    doctorsCache = JSON.parse(data);
  } catch (e) {
    doctorsCache = [];
    console.error('Failed to load doctors.json:', e.message);
  }
  return doctorsCache;
}

router.get('/', (req, res) => {
  let doctors = getDoctors();
  const { specialty, language, insurance, available_now, tourist_reviewed, max_fee, search } = req.query;

  if (specialty) {
    doctors = doctors.filter(d => d.specialty?.toLowerCase().includes(specialty.toLowerCase()));
  }
  if (language) {
    doctors = doctors.filter(d => d.languages?.some(l => l.lang?.toLowerCase().includes(language.toLowerCase())));
  }
  if (insurance) {
    doctors = doctors.filter(d => d.insurance_accepted?.some(ins => ins.toLowerCase().includes(insurance.toLowerCase())));
  }
  if (available_now === 'true') {
    doctors = doctors.filter(d => d.available_now === true);
  }
  if (tourist_reviewed === 'true') {
    doctors = doctors.filter(d => d.badges?.includes('tourist_reviewed'));
  }
  if (max_fee) {
    doctors = doctors.filter(d => d.tourist_consultation_fee_min <= parseInt(max_fee));
  }
  if (search) {
    const s = search.toLowerCase();
    doctors = doctors.filter(d =>
      d.name?.toLowerCase().includes(s) ||
      d.specialty?.toLowerCase().includes(s) ||
      d.hospital?.toLowerCase().includes(s)
    );
  }

  res.json(doctors);
});

router.get('/:id', (req, res) => {
  const doctors = getDoctors();
  const doctor = doctors.find(d => d.id === req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json(doctor);
});

module.exports = router;
