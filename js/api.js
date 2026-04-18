// js/api.js — All fetch calls to backend
const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API error [${path}]:`, e);
    throw e;
  }
}

// === TRIAGE ===
export async function triageSymptoms(symptoms, profile, location, language) {
  try {
    return await request('/api/triage', {
      method: 'POST',
      body: JSON.stringify({ symptoms, profile, location, language })
    });
  } catch {
    // Graceful fallback for demo
    return mockTriage(symptoms);
  }
}

function mockTriage(symptoms) {
  const s = symptoms.toLowerCase();
  if (s.includes('chest') || s.includes('breath') || s.includes('heart')) {
    return { severity: 'CRITICAL', specialist_needed: 'Cardiologist', reasoning: 'Chest symptoms require immediate cardiac evaluation.', emergency_action: 'Call 112 immediately. Do not delay.', disclaimer: 'Call 112 immediately if life-threatening. MediRoute provides navigation guidance only.' };
  }
  if (s.includes('fever') || s.includes('pain') || s.includes('vomit')) {
    return { severity: 'URGENT', specialist_needed: 'General Physician', reasoning: 'Your symptoms suggest you need prompt medical attention.', disclaimer: 'MediRoute provides navigation guidance only.' };
  }
  return { severity: 'NON-URGENT', specialist_needed: 'General Physician', reasoning: 'Your symptoms can be evaluated by a general practitioner.', disclaimer: 'MediRoute provides navigation guidance only.' };
}

// === DOCTORS ===
export async function getDoctors(filters = {}) {
  try {
    const params = new URLSearchParams(filters).toString();
    return await request(`/api/doctors${params ? '?' + params : ''}`);
  } catch {
    // Load from local data as fallback
    const res = await fetch('/data/doctors.json');
    return await res.json();
  }
}

export async function matchDoctors(triageResult, profile) {
  try {
    return await request('/api/match-doctors', {
      method: 'POST',
      body: JSON.stringify({ triageResult, profile })
    });
  } catch {
    return null;
  }
}

// === CHAT ===
export async function* streamChat(messages, profile, language) {
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, profile, language })
    });
    if (!res.ok) throw new Error('Chat API error');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) yield parsed.text;
        } catch {}
      }
    }
  } catch {
    yield 'I\'m here to help! Please describe your symptoms or health concern, and I\'ll guide you to the right care. (Note: Backend is currently offline — this is a demo response.)';
  }
}

// === PRESCRIPTION OCR ===
export async function processPrescription(imageData, profile, language) {
  try {
    return await request('/api/prescription-ocr', {
      method: 'POST',
      body: JSON.stringify({ imageData, profile, language })
    });
  } catch {
    return mockPrescriptionResult();
  }
}

function mockPrescriptionResult() {
  return {
    drug_name_local: 'Augmentin 625mg',
    drug_name_home_country: 'Augmentin (same name)',
    generic_name: 'Amoxicillin + Clavulanate',
    dosage: '625mg',
    frequency: 'Twice daily (every 12 hours)',
    duration: '7 days',
    instructions_translated: 'Take with food. Avoid alcohol. Complete the full course.',
    pronunciation_guide: 'aw-MOKS-ih-SIL-in',
    dietary_restrictions: 'Take with food to reduce stomach upset',
    interaction_warning: null,
    disclaimer: 'Always confirm with your doctor or pharmacist.'
  };
}

// === DRUG INTERACTION ===
export async function checkDrugInteraction(newDrug, currentMeds, language) {
  try {
    return await request('/api/drug-interaction', {
      method: 'POST',
      body: JSON.stringify({ newDrug, currentMeds, language })
    });
  } catch {
    return { interaction_found: false, severity: 'none', warning: null, recommendation: 'Consult your doctor before taking any new medication.', disclaimer: 'Always confirm with your doctor or pharmacist.' };
  }
}

// === COST PREDICTION ===
export async function predictCost(specialistType, city, insurer, language) {
  try {
    return await request('/api/cost-predict', {
      method: 'POST',
      body: JSON.stringify({ specialistType, city, insurer, language })
    });
  } catch {
    return mockCostPrediction(specialistType);
  }
}

function mockCostPrediction(specialist) {
  return {
    consultation_range: '₹800–₹1,500',
    lab_range: '₹500–₹2,000',
    pharmacy_range: '₹200–₹800',
    total_range: '₹1,500–₹4,300',
    total_usd: '$18–$52',
    insurance_coverage_pct: '~70%',
    out_of_pocket_estimate: '₹450–₹1,290',
    note: `Estimated costs for ${specialist} in India. Actual costs may vary.`
  };
}

// === NOTIFY CONTACTS ===
export async function notifyContacts(patientName, lat, lng, nearestHospital, contacts) {
  try {
    return await request('/api/notify-contacts', {
      method: 'POST',
      body: JSON.stringify({ patient_name: patientName, gps_lat: lat, gps_lng: lng, nearest_hospital: nearestHospital, contacts })
    });
  } catch {
    console.log('Emergency notification sent (mock):', { patientName, lat, lng });
    return { success: true };
  }
}

// === TRANSLATE ===
export async function translateText(text, targetLang) {
  try {
    return await request('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ text, targetLang })
    });
  } catch {
    return { translated: text };
  }
}

// === CURRENCY CONVERSION ===
let exchangeRateCache = {};
export async function getExchangeRate(from, to) {
  const key = `${from}_${to}`;
  if (exchangeRateCache[key]) return exchangeRateCache[key];
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await res.json();
    const rate = data.rates[to] || 1;
    exchangeRateCache[key] = rate;
    return rate;
  } catch {
    // Fallback rates
    const fallback = { USD: 0.012, EUR: 0.011, GBP: 0.0095, AUD: 0.019, AED: 0.044, CNY: 0.087, JPY: 1.79, RUB: 1.1, BRL: 0.063 };
    return fallback[to] || 0.012;
  }
}

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', AUD: 'A$', AED: 'AED', CNY: '¥', JPY: '¥', RUB: '₽', BRL: 'R$', INR: '₹' };

export async function formatPrice(inrAmount, toCurrency) {
  if (!toCurrency || toCurrency === 'INR') return `₹${inrAmount.toLocaleString()}`;
  const rate = await getExchangeRate('INR', toCurrency);
  const converted = (inrAmount * rate).toFixed(2);
  const symbol = CURRENCY_SYMBOLS[toCurrency] || toCurrency;
  return `₹${inrAmount.toLocaleString()} (~${symbol}${converted} ${toCurrency})`;
}

// === FIND GENERIC DRUG ===
const MEDICINE_MAPPING = {
  'tylenol': { generic: 'Paracetamol / Acetaminophen', indian_brand: 'Crocin / Dolo 650 / Calpol', savings: 85, branded_price: 350, generic_price: 30 },
  'panadol': { generic: 'Paracetamol', indian_brand: 'Dolo 650 / Calpol', savings: 85, branded_price: 320, generic_price: 30 },
  'advil': { generic: 'Ibuprofen', indian_brand: 'Brufen / Ibugesic', savings: 75, branded_price: 450, generic_price: 45 },
  'motrin': { generic: 'Ibuprofen', indian_brand: 'Brufen', savings: 75, branded_price: 450, generic_price: 45 },
  'aspirin': { generic: 'Acetylsalicylic Acid', indian_brand: 'Ecosprin / Disprin', savings: 90, branded_price: 200, generic_price: 15 },
  'zantac': { generic: 'Ranitidine', indian_brand: 'Rantac / Aciloc', savings: 80, branded_price: 300, generic_price: 40 },
  'prilosec': { generic: 'Omeprazole', indian_brand: 'Omez / Omizac', savings: 70, branded_price: 500, generic_price: 120 },
  'nexium': { generic: 'Esomeprazole', indian_brand: 'Nexpro / Esomac', savings: 65, branded_price: 600, generic_price: 180 },
  'claritin': { generic: 'Loratadine', indian_brand: 'Loridin / Claridin', savings: 60, branded_price: 400, generic_price: 120 },
  'zyrtec': { generic: 'Cetirizine', indian_brand: 'Okacet / Cetzine', savings: 60, branded_price: 350, generic_price: 90 },
  'lipitor': { generic: 'Atorvastatin', indian_brand: 'Atorva / Lipvas', savings: 70, branded_price: 800, generic_price: 220 },
  'xanax': { generic: 'Alprazolam', indian_brand: 'Alprax / Restyl', savings: 50, branded_price: 200, generic_price: 80 },
  'valium': { generic: 'Diazepam', indian_brand: 'Calmpose', savings: 50, branded_price: 150, generic_price: 60 },
  'augmentin': { generic: 'Amoxicillin + Clavulanate', indian_brand: 'Augmentin / Advent / Moxikind-CV', savings: 40, branded_price: 650, generic_price: 380 },
  'viagra': { generic: 'Sildenafil', indian_brand: 'Suhagra / Manforce', savings: 85, branded_price: 1200, generic_price: 150 },
  'ventolin': { generic: 'Salbutamol', indian_brand: 'Asthalin', savings: 70, branded_price: 350, generic_price: 95 }
};

export async function findGenericDrug(drugName = '', dosage = '', homeCountry = '', language = 'en') {
  console.log('--- Medicine Search Start ---');
  console.log('Input:', { drugName, dosage, homeCountry, language });

  const safeDrugName = String(drugName || '').trim();
  const searchKey = safeDrugName.toLowerCase();

  try {
    // Attempt real API call (will likely fail in demo)
    const res = await request('/api/generic-drug', {
      method: 'POST',
      body: JSON.stringify({ drugName: safeDrugName, dosage, homeCountry, language })
    }).catch(() => null);

    if (res && res.generic_name) {
      console.log('API Match:', res);
      return res;
    }
  } catch (err) {
    console.warn('API Request failed:', err);
  }

  // Fallback to local mapping
  console.log('Using local mapping for:', searchKey);
  const match = MEDICINE_MAPPING[searchKey];

  if (match) {
    console.log('Local Match Found:', match);
    return {
      generic_name: String(match.generic || 'Unknown Composition'),
      home_brand: safeDrugName,
      indian_brand: String(match.indian_brand || 'Local Equivalent'),
      branded_price_inr: Number(match.branded_price || 0),
      generic_price_inr: Number(match.generic_price || 0),
      saving_percent: Number(match.savings || 0),
      notes: `The Indian equivalent for ${safeDrugName} is widely available as ${match.indian_brand}.`
    };
  }

  console.log('No match found, returning generic fallback');
  return {
    generic_name: `Generic ${safeDrugName}`,
    home_brand: safeDrugName,
    indian_brand: 'Ask pharmacist for local alternative',
    branded_price_inr: 250,
    generic_price_inr: 80,
    saving_percent: 68,
    notes: 'Brand not in our quick-list. Show the generic name (Composition) to any pharmacist for a local match.'
  };
}
