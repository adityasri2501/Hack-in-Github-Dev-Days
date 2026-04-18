# MediRoute 🏥
### Emergency Healthcare Navigation for International Travelers

MediRoute is a production-quality, multilingual emergency healthcare web application that helps international tourists navigate foreign healthcare systems. Built for the MLH Hackathon.

---

## What MediRoute Does

MediRoute acts as an AI-powered healthcare navigator for tourists in India. When you're sick in a foreign country, MediRoute helps you:

- **Instantly assess** your symptoms via AI triage (voice or text, any language)
- **Find the right doctor** — filtered by specialty, language spoken, insurance accepted, and tourist reviews
- **Translate prescriptions** into your language with drug interaction checks  
- **Generate medical QR codes** pre-translated to the local language for doctor handoff
- **Chat with an AI health assistant** in your native language
- **Locate pharmacies** on a live map with generic drug equivalents
- **Manage insurance claims** with auto-generated invoices and claim packages
- **Track your visit history** with AI-generated plain-language summaries

---

## Setup

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install dependencies
```bash
cd mediroute
npm install
```

### 2. Configure API keys
```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```
ANTHROPIC_API_KEY=sk-ant-...           # Required for all AI features
GOOGLE_VISION_API_KEY=...              # Optional: for prescription OCR
TWILIO_ACCOUNT_SID=...                 # Optional: for real SMS alerts
TWILIO_AUTH_TOKEN=...
EXCHANGE_RATE_API_KEY=...              # Optional: live currency rates
PORT=3000
```

> **Without API keys**: All features gracefully fall back to smart mock responses. The app is fully functional in demo mode.

### 3. Start the server
```bash
npm run dev       # Development (auto-restart with nodemon)
# or
npm start         # Production
```

### 4. Open in browser
```
http://localhost:3000
```

---

## Project Structure

```
mediroute/
├── index.html              ← SPA shell (header, nav, modals)
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service worker (offline support)
├── server.js               ← Express backend
├── styles/
│   ├── main.css            ← Design tokens, global styles
│   ├── components.css      ← Reusable UI components
│   └── screens.css         ← Screen-specific styles
├── js/
│   ├── app.js              ← SPA router + app init
│   ├── state.js            ← Global state (localStorage)
│   ├── api.js              ← Backend fetch calls + fallbacks
│   ├── voice.js            ← Web Speech API integration
│   ├── qr.js               ← QR code generation
│   ├── i18n.js             ← 10-language translation system
│   └── screens/
│       ├── home.js         ← Home/SOS screen
│       ├── triage.js       ← AI symptom triage (text + voice)
│       ├── doctors.js      ← Doctor search + AI matching
│       ├── doctor-detail.js← Doctor profile + booking
│       ├── profile.js      ← 7-tab patient profile
│       ├── pharmacy.js     ← Pharmacy map + generic finder
│       ├── prescription.js ← OCR + translation
│       ├── chat.js         ← Streaming AI health chat
│       ├── insurance.js    ← Insurance + invoice + claims
│       └── history.js      ← Visit timeline + AI summaries
├── api/
│   ├── shared.js           ← Claude API helper
│   ├── triage.js           ← POST /api/triage
│   ├── doctors.js          ← GET /api/doctors
│   ├── match.js            ← POST /api/match-doctors
│   ├── translate.js        ← POST /api/translate
│   ├── prescription.js     ← POST /api/prescription-ocr
│   ├── chat.js             ← POST /api/chat (streaming SSE)
│   ├── drug-check.js       ← POST /api/drug-interaction
│   ├── cost-predict.js     ← POST /api/cost-predict
│   └── notify.js           ← POST /api/notify-contacts
└── data/
    ├── doctors.json        ← 20+ seeded doctor profiles
    ├── clinics.json        ← 10+ clinic profiles
    └── translations.json   ← UI strings in 10 languages
```

---

## Features

| Module | Description |
|--------|-------------|
| 🚨 SOS Emergency | One-tap GPS location sharing + emergency contact notification |
| 🎤 Voice Triage | Speak symptoms in any of 10 languages via Web Speech API |
| 🤖 AI Triage | Claude-powered severity assessment (CRITICAL/URGENT/NON-URGENT) |
| 👨‍⚕️ Doctor Search | 20+ doctors, filter by specialty, language, insurance, fee |
| 🤝 AI Doctor Match | Claude ranks top 3 doctors for your specific symptom + profile |
| 📱 Medical QR | Auto-translated QR card for instant doctor handoff |
| 💊 Prescription OCR | Upload prescription → translate → drug interaction check |
| 💬 AI Health Chat | Streaming multilingual chat with Claude |
| 🗺️ Pharmacy Finder | Leaflet map + generic drug equivalent finder |
| 🛡️ Insurance | Invoice generator + claim package builder + cost predictor |
| 📋 Visit History | Timeline with AI plain-language visit summaries |
| 🌍 10 Languages | EN, FR, ES, DE, AR (RTL), ZH, JA, RU, PT, HI |
| 💰 Currency | Live INR + tourist home currency on all prices |
| 📲 PWA | Installable, offline-capable, push notifications |

---

## Demo Flow for Judges

1. **Open** `http://localhost:3000`
2. **Language** — auto-detected from browser, or change via 🌐 top right
3. **SOS Button** — tap the giant pulsing red button → GPS + emergency modal
4. **Voice Triage** — tap "🎤 Voice Symptom Check" → speak symptoms → AI result
5. **AI Doctor Match** — after triage, see top 3 AI-matched doctors
6. **Doctor Profile** — tap any doctor → full profile, reviews, map, booking
7. **Medical QR Code** — go to Profile → fill blood type + allergies → Generate QR
8. **Prescription Scan** — go to Prescription → "Try Demo" → AI analyzes
9. **AI Chat** — go to Chat → type or speak any health question
10. **Insurance Invoice** — go to Insurance → Invoice tab → fill form → preview

---

## AI Features (Claude `claude-sonnet-4-20250514`)

All AI calls go through the backend (`/api/*`). API keys are never exposed client-side.

- **Triage**: Classifies severity, recommends specialist, responds in tourist's language
- **Doctor Matching**: Ranks doctors by language match, insurance, reviews, budget
- **Chat**: Streaming multilingual health navigation (never diagnosis)
- **Prescription**: Extracts, translates, checks interactions, finds home-country equivalent
- **Drug Interaction**: Checks new medication against current list
- **Cost Prediction**: Estimates visit costs with insurance coverage breakdown
- **Generic Finder**: Identifies generic equivalent drugs with price comparison

---

## Emergency Numbers
- 🇮🇳 India: **112**
- 🇺🇸 USA: **911**  
- 🇬🇧 UK: **999**
- 🇦🇺 Australia: **000**

> **Disclaimer**: MediRoute provides healthcare navigation guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always call emergency services for life-threatening situations.
