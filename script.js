/**
 * INITIALIZATION & CONFIGURATION
 */
const apiKey = ""; // Injected by execution environment
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

let mapInstance = null; // Global map reference

/**
 * STATE & DATA MANAGEMENT
 */
let STATE = {
    lang: 'en',
    currency: 'USD',
    exchangeRate: 0.012, // Mock 1 INR = 0.012 USD
    location: { lat: null, lng: null },
    chatHistory: [], // Stores conversation context for AI
    profile: JSON.parse(localStorage.getItem('mr_profile')) || {
        name: '', nationality: '', dob: '', blood_type: '', allergies: [], medications: [], conditions: [],
        emergency_contacts: [{ name: '', phone: '' }]
    }
};

const saveProfile = () => localStorage.setItem('mr_profile', JSON.stringify(STATE.profile));

// Professional Mock Seed Data
const DB = {
    hospitals: [
        { name: "Apollo Emergency Dept", lat: 19.0420, lng: 72.8610, phone: "1066" },
        { name: "City Care ER", lat: 19.0500, lng: 72.8550, phone: "112" },
        { name: "Global Hospital Triage", lat: 19.0350, lng: 72.8700, phone: "108" }
    ],
    doctors: [
        {
            id: "dr_001", name: "Dr. Priya Sharma", specialty: "Cardiology",
            hospital: "Apollo Hospital Mumbai", lat: 19.0422, lng: 72.8618,
            languages: [{ lang: "English", level: "Fluent" }, { lang: "French", level: "Conversational" }],
            tourist_consultation_fee_min: 900, tourist_consultation_fee_max: 1200,
            badges: ["nmc_verified", "tourist_reviewed", "english_speaking"],
            tourist_review_score: 4.8, available_now: true, photo: "https://i.pravatar.cc/150?img=47"
        },
        {
            id: "dr_002", name: "Dr. Arjun Patel", specialty: "General Medicine",
            hospital: "Fortis Escorts", lat: 28.5606, lng: 77.2796,
            languages: [{ lang: "English", level: "Fluent" }, { lang: "Spanish", level: "Basic" }],
            tourist_consultation_fee_min: 500, tourist_consultation_fee_max: 800,
            badges: ["english_speaking", "walk_ins"],
            tourist_review_score: 4.5, available_now: true, photo: "https://i.pravatar.cc/150?img=11"
        },
        {
            id: "dr_003", name: "Dr. Riya Singh", specialty: "Dermatology",
            hospital: "Manipal Hospital Goa", lat: 15.4909, lng: 73.8278,
            languages: [{ lang: "English", level: "Fluent" }, { lang: "German", level: "Fluent" }],
            tourist_consultation_fee_min: 1000, tourist_consultation_fee_max: 1500,
            badges: ["nmc_verified", "insurance_accepted"],
            tourist_review_score: 4.9, available_now: false, photo: "https://i.pravatar.cc/150?img=32"
        }
    ],
    pharmacies: [
        { name: "Apollo Pharmacy (24/7)", lat: 19.0450, lng: 72.8650, open247: true, tags: ["English", "Intl Card"] },
        { name: "MedPlus Walk-in", lat: 19.0400, lng: 72.8600, open247: false, tags: ["English"] },
        { name: "Wellness Forever", lat: 19.0510, lng: 72.8590, open247: true, tags: ["Delivery", "English"] }
    ]
};

// Comprehensive i18n dictionary for fully multilingual UI
const i18n = {
    en: {
        nav_home: "Home", nav_doctors: "Doctors", nav_chat: "AI Chat", nav_pharmacy: "Map", nav_profile: "Profile", nav_dashboard: "Dashboard",
        tagline: "Your Personal Health Navigator", sos_tap: "EMERGENCY SOS", sos_btn_short: "SOS",
        voice_triage: "Symptom Check", find_doc: "Find Doctor", near_pharm: "Pharmacy",
        triage_title: "AI Triage", triage_desc: "Describe how you're feeling... (any language)", triage_btn: "Analyze Symptoms",
        loading: "AI is analyzing...", doc_book: "Book Appointment", qr_title: "MEDICAL PASSPORT",
        nearest_to_you: "Showing nearest to you", loc_not_enabled: "Location not enabled",
        all_specialties: "All Specialties", language: "Language", insurance: "Insurance",
        foreign_reviews: "Foreign Reviews", verified: "Verified", english: "English", fee: "Fee",
        profile_btn: "Profile", transparent_pricing: "Transparent Pricing",
        fixed_tourist_fee: "Fixed Tourist Fee (Consultation):", no_surprise: "No surprise charges. Pre-agreed rates.",
        gen_med_finder: "Generic Medicine Finder", search_btn: "Search",
        emergency_footer: "Call 112 (IN) - 911 (US) - 999 (UK)",
        chat_placeholder: "Ask a health question...", scan_rx: "Scan Rx", loc_transmitted: "Location Transmitted",
        dismiss_alert: "Dismiss Alert", dial_now: "DIAL NOW", nearest_center: "Nearest Emergency Center"
    }
};

// Utility: Haversine distance in KM
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Utility: Geolocation Service + Dynamic Mock Relocation
async function updateLocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    STATE.location = { lat, lng };

                    // MAGIC TRICK FOR DEMONSTRATION:
                    // Dynamically relocate the mock database relative to the user's actual location
                    // so the "Nearby Doctors" and "SOS" features always work perfectly no matter where they test it.
                    DB.hospitals.forEach((h, i) => { h.lat = lat + (i * 0.015); h.lng = lng + (i * 0.01); });
                    DB.doctors.forEach((d, i) => { d.lat = lat - (i * 0.01); d.lng = lng + (i * 0.015); });
                    DB.pharmacies.forEach((p, i) => { p.lat = lat + (i * 0.005); p.lng = lng - (i * 0.01); });

                    resolve(STATE.location);
                },
                (err) => { console.warn("Location error:", err); resolve(null); },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else resolve(null);
    });
}

// Custom Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgConfig = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-white border-neutral-200 text-neutral-800 shadow-soft'
    };
    const iconConfig = { success: 'check-circle', error: 'alert-circle', info: 'info' };

    toast.className = "flex items-center gap-3 w-full p-3 rounded-xl border pointer-events-auto shadow-float transform transition-all duration-300 translate-y-[-20px] opacity-0 " + bgConfig[type];
    toast.innerHTML = "<i data-lucide='" + iconConfig[type] + "' class='w-5 h-5 flex-shrink-0'></i><p class='text-sm font-medium'>" + message + "</p>";

    container.prepend(toast);
    lucide.createIcons({ root: toast });

    setTimeout(() => { toast.classList.remove('translate-y-[-20px]', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); }, 10);
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function setLang(langCode) {
    STATE.lang = langCode;
    document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('current-lang-display').innerText = langCode.toUpperCase();
    document.getElementById('lang-menu').classList.add('hidden');
    renderView(window.location.hash.slice(1) || '/'); // Re-render first to inject updated t() strings
    applyTranslations(); // Then apply static data-i18n tags
    showToast("Language set to " + langCode.toUpperCase(), 'success');
}

function toggleLangMenu() { document.getElementById('lang-menu').classList.toggle('hidden'); }
function t(key) { return i18n[STATE.lang] ? (i18n[STATE.lang][key] || i18n['en'][key] || key) : (i18n['en'][key] || key); }
function applyTranslations() { document.querySelectorAll('[data-i18n]').forEach(el => { el.innerText = t(el.getAttribute('data-i18n')); }); }

/**
 * AI & API UTILITIES
 */
async function callGemini(prompt, systemInstruction, schema = null, imageBase64 = null, addHistory = false) {
    if (!apiKey) return { error: "API Key missing. Run in provided environment." };

    let contents = [];

    if (addHistory && STATE.chatHistory.length > 0) {
        contents = [...STATE.chatHistory];
    }

    const parts = [];
    if (prompt) parts.push({ text: prompt });
    if (imageBase64) {
        const mimeType = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/)[1];
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({ inlineData: { mimeType, data: base64Data } });
    }

    const currentMessage = { role: "user", parts };
    contents.push(currentMessage);

    const payload = { contents };
    if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    if (schema) payload.generationConfig = { responseMimeType: "application/json", responseSchema: schema };

    try {
        const res = await fetch(GEMINI_URL + "?key=" + apiKey, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text;

        if (addHistory) {
            STATE.chatHistory.push(currentMessage);
            STATE.chatHistory.push({ role: "model", parts: [{ text: responseText }] });
            if (STATE.chatHistory.length > 10) STATE.chatHistory = STATE.chatHistory.slice(-10);
        }

        return schema ? JSON.parse(responseText) : responseText;
    } catch (err) {
        console.error("Gemini API Error:", err);
        showToast("AI Processing Failed: " + err.message, "error");
        return null;
    }
}

const formatPrice = (inr) => "<span class='font-bold text-neutral-900'>₹" + inr + "</span> <span class='text-xs text-neutral-500'>(~$" + (inr * STATE.exchangeRate).toFixed(2) + ")</span>";

const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = STATE.lang === 'en' ? 'en-US' : (STATE.lang === 'fr' ? 'fr-FR' : (STATE.lang === 'es' ? 'es-ES' : 'en-US'));
    window.speechSynthesis.speak(utterance);
};

/**
 * ROUTING & RENDER ENGINE
 */
function renderView(path) {
    const root = document.getElementById('app-root');
    const cleanPath = path.split('?')[0];

    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.getAttribute('data-path') === cleanPath) el.classList.add('text-primary');
        else el.classList.remove('text-primary');
    });

    if (cleanPath !== '/pharmacy' && mapInstance) { mapInstance.remove(); mapInstance = null; }

    const views = {
        '/': viewHome, '/triage': viewTriage, '/doctors': viewDoctors,
        '/profile': viewProfile, '/pharmacy': viewPharmacy, '/dashboard': viewDashboard,
        '/prescription': viewPrescription, '/chat': viewChat, '/insurance': viewInsurance
    };

    if (cleanPath.startsWith('/doctors/')) {
        root.innerHTML = viewDoctorDetail(cleanPath.split('/')[2]);
    } else if (views[cleanPath]) {
        root.innerHTML = views[cleanPath]();
        if (cleanPath === '/pharmacy') setTimeout(initPharmacyMap, 300);
    } else {
        root.innerHTML = viewHome();
    }

    lucide.createIcons();
    applyTranslations();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', () => renderView(window.location.hash.slice(1) || '/'));

/**
 * VIEWS
 */

// 1. HOME SCREEN
function viewHome() {
    return "<div class='flex flex-col items-center px-5 animate-fade-in pb-10'>" +
        "<div class='text-center mt-6 mb-12'>" +
        "<h1 class='text-3xl font-black text-neutral-900 tracking-tight mb-2 flex items-center justify-center gap-2'>MediRoute</h1>" +
        "<p class='text-neutral-500 font-medium'>" + t('tagline') + "</p>" +
        "</div>" +
        "<button onclick=\"window.location.hash='/triage?mode=emergency'; triggerSOS(true);\" class='relative w-44 h-44 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(232,69,69,0.4)] mb-14 transition-transform hover:scale-105 active:scale-95 group'>" +
        "<div class='absolute inset-0 rounded-full border-[6px] border-white/20 animate-ping' style='animation-duration: 2s;'></div>" +
        "<div class='absolute inset-2 rounded-full border-2 border-white/10'></div>" +
        "<i data-lucide='siren' class='w-14 h-14 mb-2 group-hover:animate-pulse'></i>" +
        "<span class='font-black text-3xl tracking-widest drop-shadow-md'>" + t('sos_btn_short') + "</span>" +
        "<span class='text-[11px] mt-1 font-bold px-2 text-center leading-tight uppercase tracking-widest text-white/90 drop-shadow'>" + t('sos_tap') + "</span>" +
        "</button>" +
        "<div class='grid grid-cols-2 gap-4 w-full max-w-md'>" +
        "<a href='#/dashboard' class='bg-white p-5 rounded-2xl shadow-soft border border-neutral-100 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:shadow-float transition-all group'>" +
        "<div class='w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform'><i data-lucide='layout-dashboard'></i></div>" +
        "<span class='text-xs font-bold text-neutral-700 text-center uppercase tracking-wide'>" + t('nav_dashboard') + "</span>" +
        "</a>" +
        "<a href='#/triage' class='bg-white p-5 rounded-2xl shadow-soft border border-neutral-100 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:shadow-float transition-all group'>" +
        "<div class='w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform'><i data-lucide='stethoscope'></i></div>" +
        "<span class='text-xs font-bold text-neutral-700 text-center uppercase tracking-wide'>" + t('voice_triage') + "</span>" +
        "</a>" +
        "<a href='#/doctors' class='bg-white p-5 rounded-2xl shadow-soft border border-neutral-100 flex flex-col items-center justify-center gap-3 hover:border-secondary/50 hover:shadow-float transition-all group'>" +
        "<div class='w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform'><i data-lucide='search'></i></div>" +
        "<span class='text-xs font-bold text-neutral-700 text-center uppercase tracking-wide'>" + t('find_doc') + "</span>" +
        "</a>" +
        "<a href='#/pharmacy' class='bg-white p-5 rounded-2xl shadow-soft border border-neutral-100 flex flex-col items-center justify-center gap-3 hover:border-warning/50 hover:shadow-float transition-all group'>" +
        "<div class='w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-warning group-hover:scale-110 transition-transform'><i data-lucide='map-pin'></i></div>" +
        "<span class='text-xs font-bold text-neutral-700 text-center uppercase tracking-wide'>" + t('near_pharm') + "</span>" +
        "</a>" +
        "</div>" +
        "</div>";
}

// PATIENT DASHBOARD
function viewDashboard() {
    return "<div class='p-5 max-w-lg mx-auto pb-28 animate-fade-in'>" +
        "<div class='flex justify-between items-center mb-6'>" +
        "<div><h2 class='text-2xl font-black text-neutral-900 tracking-tight'>Dashboard</h2><p class='text-sm text-neutral-500'>Welcome back, " + STATE.profile.name + "</p></div>" +
        "<a href='#/profile' class='w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition'><i data-lucide='user' class='w-6 h-6'></i></a>" +
        "</div>" +

        "<div class='bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-float mb-6'>" +
        "<div class='flex justify-between items-center mb-4'><h3 class='font-bold text-sm uppercase tracking-wider text-white/80'>Vitals & Profile</h3><i data-lucide='activity' class='w-5 h-5'></i></div>" +
        "<div class='grid grid-cols-2 gap-4'>" +
        "<div><p class='text-[10px] text-white/70 uppercase'>Blood Type</p><p class='font-black text-xl'>" + (STATE.profile.blood_type || 'Unknown') + "</p></div>" +
        "<div><p class='text-[10px] text-white/70 uppercase'>Allergies</p><p class='font-bold text-sm'>" + (STATE.profile.allergies.length ? STATE.profile.allergies.join(', ') : 'None') + "</p></div>" +
        "</div>" +
        "</div>" +

        "<h3 class='font-bold text-neutral-900 mb-3'>Upcoming Appointments</h3>" +
        "<div class='bg-white p-4 rounded-2xl shadow-soft border border-neutral-100 mb-6 flex items-center justify-between'>" +
        "<div class='flex items-center gap-4'><div class='bg-blue-50 text-secondary p-3 rounded-xl'><i data-lucide='calendar' class='w-6 h-6'></i></div><div><p class='font-bold text-sm text-neutral-900'>Dr. Priya Sharma</p><p class='text-xs text-neutral-500'>Tomorrow, 10:00 AM</p></div></div>" +
        "<button class='text-xs font-bold text-primary'>View</button>" +
        "</div>" +

        "<h3 class='font-bold text-neutral-900 mb-3'>Quick Actions</h3>" +
        "<div class='grid grid-cols-2 gap-3'>" +
        "<a href='#/prescription' class='bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex flex-col gap-2 hover:border-primary/50 transition group'><i data-lucide='scan-line' class='w-6 h-6 text-primary group-hover:scale-110 transition'></i><span class='font-bold text-xs text-neutral-700'>Scan Rx</span></a>" +
        "<a href='#/chat' class='bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex flex-col gap-2 hover:border-primary/50 transition group'><i data-lucide='message-square' class='w-6 h-6 text-secondary group-hover:scale-110 transition'></i><span class='font-bold text-xs text-neutral-700'>AI Assistant</span></a>" +
        "</div>" +
        "</div>";
}

// 2. TRIAGE SCREEN (AI)
function viewTriage() {
    let buttons = ['Fever', 'Chest Pain', 'Headache', 'Stomach ache', 'Breathing issues', 'Injury'].map(s =>
        "<button onclick=\"document.getElementById('triage-input').value += '" + s + ", '\" class='whitespace-nowrap px-4 py-1.5 bg-white border border-neutral-200 text-xs font-medium text-neutral-600 rounded-full hover:bg-neutral-50 hover:text-primary transition-colors shadow-sm'>" + s + "</button>"
    ).join('');

    return "<div class='p-5 max-w-lg mx-auto animate-fade-in'>" +
        "<h2 class='text-2xl font-black mb-1 text-neutral-900 tracking-tight'>" + t('triage_title') + "</h2>" +
        "<p class='text-sm text-neutral-500 mb-6'>" + t('triage_desc') + "</p>" +
        "<div class='bg-white rounded-2xl shadow-soft border border-neutral-100 p-5 mb-6'>" +
        "<textarea id='triage-input' class='w-full h-32 p-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none resize-none text-sm placeholder:text-neutral-400 transition-all' placeholder='" + t('triage_desc') + "'></textarea>" +
        "<div class='flex gap-2 overflow-x-auto py-4 no-scrollbar'>" + buttons + "</div>" +
        "<div class='flex gap-3'>" +
        "<button onclick='startVoiceTriage()' id='mic-btn' class='w-12 h-12 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-red-50 hover:text-primary hover:border-red-100 transition-all shadow-sm flex-shrink-0'><i data-lucide='mic' class='w-5 h-5'></i></button>" +
        "<button onclick='submitTriage()' class='flex-1 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-neutral-800 transition-colors shadow-md flex items-center justify-center gap-2'><i data-lucide='activity' class='w-4 h-4'></i> " + t('triage_btn') + "</button>" +
        "</div></div>" +
        "<div id='triage-result' class='hidden'></div></div>";
}

let recognition;
function startVoiceTriage() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast("Voice input not supported in your browser.", "error"); return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.lang = STATE.lang === 'en' ? 'en-US' : (STATE.lang === 'fr' ? 'fr-FR' : (STATE.lang === 'es' ? 'es-ES' : 'en-US'));
    recognition.interimResults = true;

    const btn = document.getElementById('mic-btn');
    const input = document.getElementById('triage-input');
    btn.classList.add('bg-primary', 'text-white', 'border-primary', 'animate-pulse');
    btn.classList.remove('bg-white', 'text-neutral-600');

    recognition.onresult = (e) => {
        input.value = Array.from(e.results).map(r => r[0].transcript).join('');
    };

    recognition.onend = () => {
        btn.classList.remove('bg-primary', 'text-white', 'border-primary', 'animate-pulse');
        btn.classList.add('bg-white', 'text-neutral-600');
        if (input.value.length > 5) submitTriage();
    };

    recognition.start();
}

async function submitTriage() {
    const input = document.getElementById('triage-input').value;
    if (!input) { showToast("Please enter your symptoms first.", "info"); return; }

    const resultDiv = document.getElementById('triage-result');
    resultDiv.innerHTML = "<div class='text-center p-8 bg-white rounded-2xl shadow-soft'><i data-lucide='loader-2' class='w-8 h-8 animate-spin mx-auto mb-3 text-primary'></i> <p class='text-sm font-medium text-neutral-600'>" + t('loading') + "</p></div>";
    resultDiv.classList.remove('hidden');
    lucide.createIcons();

    const prompt = "Patient language: " + STATE.lang + ". Symptoms: " + input + ". Known Allergies: " + (STATE.profile.allergies.join(', ') || 'None') + ".";
    const sys = "You are an expert AI Triage Assistant. Assess severity and route the patient. CRITICAL: Heart attack signs, stroke, severe bleeding, breathing distress. Action: ER. URGENT: High fever, bad injury, severe pain. Action: Specialist/Urgent Care. NON-URGENT: Mild issues. Action: GP. Output JSON only.";

    const schema = {
        type: "OBJECT",
        properties: {
            severity: { type: "STRING", enum: ["CRITICAL", "URGENT", "NON-URGENT"] },
            specialist_needed: { type: "STRING" },
            reasoning: { type: "STRING" },
            emergency_action: { type: "STRING" }
        }
    };

    const res = await callGemini(prompt, sys, schema);
    if (!res) { resultDiv.innerHTML = "<div class='p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm font-medium border border-red-100'>Failed to analyze. Please try again.</div>"; return; }

    const styles = {
        'CRITICAL': { border: 'border-danger', bg: 'bg-danger/5', text: 'text-danger', icon: 'alert-triangle' },
        'URGENT': { border: 'border-warning', bg: 'bg-warning/5', text: 'text-amber-600', icon: 'alert-circle' },
        'NON-URGENT': { border: 'border-success', bg: 'bg-success/5', text: 'text-emerald-700', icon: 'check-circle' }
    };
    const s = styles[res.severity];

    let actionBtn = res.severity === 'CRITICAL' ?
        "<button onclick='triggerSOS(true)' class='flex-1 bg-danger text-white py-3 rounded-xl font-bold shadow-[0_8px_20px_rgba(219,68,55,0.3)] hover:bg-red-700 transition flex items-center justify-center gap-2'><i data-lucide='phone-call' class='w-4 h-4'></i> EMERGENCY SOS</button>" :
        "<a href='#/doctors' class='flex-1 bg-neutral-900 text-white text-center py-3 rounded-xl font-bold text-sm shadow-md hover:bg-neutral-800 transition'>" + t('find_doc') + "</a>";

    resultDiv.innerHTML = "<div class='border-2 " + s.border + " " + s.bg + " rounded-2xl p-6 relative animate-fade-in shadow-soft'>" +
        "<div class='flex justify-between items-start mb-4'>" +
        "<span class='font-black text-xl flex items-center gap-2 " + s.text + " tracking-tight'><i data-lucide='" + s.icon + "' class='w-6 h-6'></i> " + res.severity + "</span>" +
        "<button onclick=\"speakText('" + res.reasoning.replace(/'/g, "\\'") + "')\" class='p-2 bg-white rounded-full shadow-sm hover:shadow text-neutral-600 transition-shadow'><i data-lucide='volume-2' class='w-4 h-4'></i></button>" +
        "</div>" +
        "<div class='bg-white p-4 rounded-xl border border-neutral-100 shadow-sm mb-4'>" +
        "<p class='text-[11px] uppercase tracking-wider text-neutral-400 font-bold mb-1'>Recommended Specialist</p>" +
        "<p class='font-bold text-neutral-900'>" + res.specialist_needed + "</p></div>" +
        "<p class='text-sm font-medium text-neutral-700 leading-relaxed mb-4'>" + res.reasoning + "</p>" +
        (res.emergency_action ? "<div class='bg-white/80 p-3 rounded-lg border border-" + s.border.split('-')[1] + "/30 mb-5'><p class='text-xs font-bold " + s.text + " flex items-start gap-1.5'><i data-lucide='info' class='w-4 h-4 flex-shrink-0'></i> <span>" + res.emergency_action + "</span></p></div>" : "") +
        "<div class='flex gap-3'>" + actionBtn + "</div></div>";

    lucide.createIcons();
}

// 3. DOCTORS LIST (With Distance Calculation)
function viewDoctors() {
    let sortedDoctors = [...DB.doctors];
    if (STATE.location.lat) {
        sortedDoctors.forEach(d => d.dist = getDistance(STATE.location.lat, STATE.location.lng, d.lat, d.lng));
        sortedDoctors.sort((a, b) => a.dist - b.dist);
    }

    let docsHtml = sortedDoctors.map(d =>
        "<div class='bg-white p-5 rounded-2xl shadow-soft border border-neutral-100 cursor-pointer hover:shadow-float hover:border-primary/20 transition-all group' onclick=\"window.location.hash='/doctors/" + d.id + "'\">" +
        "<div class='flex gap-4 mb-4'><img src='" + d.photo + "' class='w-16 h-16 rounded-full object-cover border border-neutral-200 shadow-sm'>" +
        "<div class='flex-1'><div class='flex justify-between items-start'><h3 class='font-bold text-neutral-900 leading-tight'>" + d.name + "</h3>" +
        (d.dist ? "<span class='text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full'>" + d.dist.toFixed(1) + " km</span>" : "") +
        "</div><p class='text-xs font-medium text-primary mb-1'>" + d.specialty + "</p>" +
        "<div class='flex items-center gap-1 text-[11px] font-bold text-warning'><i data-lucide='star' class='w-3 h-3 fill-warning text-warning'></i> " + d.tourist_review_score + " <span class='text-neutral-400 font-medium ml-1'>" + t('foreign_reviews') + "</span></div></div></div>" +
        "<div class='flex flex-wrap gap-1.5 mb-4'>" +
        (d.badges.includes('nmc_verified') ? "<span class='px-2.5 py-1 bg-blue-50 border border-blue-100 text-secondary text-[10px] font-bold rounded-full flex items-center gap-1'><i data-lucide='shield-check' class='w-3 h-3'></i> " + t('verified') + "</span>" : "") +
        (d.badges.includes('english_speaking') ? "<span class='px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1'><i data-lucide='languages' class='w-3 h-3'></i> " + t('english') + "</span>" : "") +
        "</div><div class='flex justify-between items-center text-sm border-t border-neutral-100 pt-3'>" +
        "<span class='text-neutral-500 text-xs'>" + t('fee') + ": " + formatPrice(d.tourist_consultation_fee_min) + "</span>" +
        "<button class='text-primary font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform'>" + t('profile_btn') + " <i data-lucide='chevron-right' class='w-3 h-3'></i></button></div></div>"
    ).join('');

    return "<div class='p-4 max-w-lg mx-auto pb-24 animate-fade-in'>" +
        "<div class='flex justify-between items-end mb-4 px-1'><div>" +
        "<h2 class='text-2xl font-black text-neutral-900 tracking-tight'>" + t('find_doc') + "</h2>" +
        (STATE.location.lat ? "<p class='text-xs font-medium text-success flex items-center gap-1'><i data-lucide='map-pin' class='w-3 h-3'></i> " + t('nearest_to_you') + "</p>" : "<p class='text-xs text-neutral-500'>" + t('loc_not_enabled') + "</p>") +
        "</div><button onclick=\"updateLocation().then(()=>renderView('/doctors'))\" class='p-2 bg-white rounded-full shadow border border-neutral-100 text-primary hover:bg-primary/5 transition'><i data-lucide='crosshair' class='w-4 h-4'></i></button></div>" +
        "<div class='flex gap-2 overflow-x-auto no-scrollbar mb-5 px-1 pb-2'>" +
        "<select class='text-xs font-medium p-2.5 rounded-xl border border-neutral-200 bg-white shadow-sm outline-none'><option>" + t('all_specialties') + "</option><option>Cardiology</option><option>General</option></select>" +
        "<select class='text-xs font-medium p-2.5 rounded-xl border border-neutral-200 bg-white shadow-sm outline-none'><option>" + t('language') + "</option><option>English</option><option>French</option></select>" +
        "<button class='text-xs font-medium px-4 py-2.5 rounded-xl bg-white border border-neutral-200 shadow-sm whitespace-nowrap hover:bg-neutral-50'>" + t('insurance') + "</button></div>" +
        "<div class='space-y-4'>" + docsHtml + "</div></div>";
}

function viewDoctorDetail(id) {
    const doc = DB.doctors.find(d => d.id === id);
    if (!doc) return "<div class='p-10 text-center text-neutral-500'>Doctor not found.</div>";

    return "<div class='pb-28 animate-fade-in bg-white min-h-screen'>" +
        "<div class='relative bg-gradient-to-b from-primary/10 to-white pt-6 pb-8 px-6 text-center border-b border-neutral-100'>" +
        "<button onclick='window.history.back()' class='absolute left-4 top-4 p-2 bg-white rounded-full shadow-sm text-neutral-600'><i data-lucide='arrow-left' class='w-5 h-5'></i></button>" +
        "<img src='" + doc.photo + "' class='w-28 h-28 mx-auto rounded-full object-cover shadow-float border-4 border-white mb-4'>" +
        "<h2 class='text-2xl font-black text-neutral-900 tracking-tight'>" + doc.name + "</h2>" +
        "<p class='text-sm font-medium text-primary mb-3'>" + doc.specialty + " - " + doc.hospital + "</p>" +
        "<div class='flex justify-center gap-2'>" +
        "<span class='px-3 py-1 bg-blue-50 text-secondary text-xs font-bold rounded-full flex items-center gap-1 border border-blue-100'><i data-lucide='shield-check' class='w-3 h-3'></i> " + t('verified') + "</span>" +
        "<span class='px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1 border border-amber-100'><i data-lucide='star' class='w-3 h-3 fill-amber-400 text-amber-400'></i> " + doc.tourist_review_score + "</span>" +
        "</div></div>" +
        "<div class='p-5 space-y-5 max-w-lg mx-auto'>" +
        "<div class='bg-neutral-50 p-5 rounded-2xl border border-neutral-200'>" +
        "<h3 class='font-bold text-xs text-neutral-400 uppercase tracking-widest mb-3'>Language & Patient Trust</h3>" +
        "<div class='space-y-2'>" +
        "<p class='text-sm font-medium flex items-center gap-2 text-neutral-700'><span class='p-1.5 bg-white rounded shadow-sm'><i data-lucide='languages' class='w-4 h-4 text-primary'></i></span> Speaks: " + doc.languages.map(l => l.lang).join(', ') + "</p>" +
        "<p class='text-sm font-medium flex items-center gap-2 text-neutral-700'><span class='p-1.5 bg-white rounded shadow-sm'><i data-lucide='globe' class='w-4 h-4 text-secondary'></i></span> Frequently treats tourists</p>" +
        "</div></div>" +
        "<div class='bg-blue-50/50 p-5 rounded-2xl border border-blue-100 relative overflow-hidden'>" +
        "<i data-lucide='receipt' class='absolute -right-4 -bottom-4 w-24 h-24 text-blue-100 opacity-50 transform rotate-12'></i>" +
        "<h3 class='font-bold text-xs text-secondary uppercase tracking-widest mb-2 relative z-10'>" + t('transparent_pricing') + "</h3>" +
        "<p class='text-xs text-neutral-600 font-medium mb-1 relative z-10'>" + t('fixed_tourist_fee') + "</p>" +
        "<p class='text-xl font-black text-neutral-900 relative z-10'>" + formatPrice(doc.tourist_consultation_fee_min) + " - " + formatPrice(doc.tourist_consultation_fee_max) + "</p>" +
        "<p class='text-[10px] text-neutral-500 mt-2 font-medium bg-white/60 inline-block px-2 py-1 rounded relative z-10'>" + t('no_surprise') + "</p>" +
        "</div></div>" +
        "<div class='fixed bottom-[68px] w-full bg-white border-t border-neutral-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] max-w-lg mx-auto left-0 right-0 z-30'>" +
        "<button onclick=\"bookAppointment('" + doc.name + "')\" class='w-full bg-neutral-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-neutral-800 transition flex items-center justify-center gap-2'>" +
        "<i data-lucide='calendar-check' class='w-5 h-5'></i> " + t('doc_book') + "</button></div></div>";
}

function bookAppointment(docName) {
    showToast("Request sent to " + docName + ". The clinic will confirm shortly.", 'success');
    setTimeout(() => window.history.back(), 2000);
}

// 4. PROFILE & QR
function viewProfile() {
    let bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b =>
        "<option value='" + b + "' " + (STATE.profile.blood_type === b ? 'selected' : '') + ">" + b + "</option>"
    ).join('');

    return "<div class='p-5 max-w-lg mx-auto pb-28 animate-fade-in'>" +
        "<h2 class='text-2xl font-black mb-6 text-neutral-900 tracking-tight'>" + t('nav_profile') + "</h2>" +
        "<div class='bg-white rounded-2xl shadow-soft border border-neutral-100 overflow-hidden mb-6'>" +
        "<div class='p-4 border-b border-neutral-100 bg-neutral-50/50'><h3 class='font-bold text-[11px] uppercase text-neutral-500 tracking-widest flex items-center gap-2'><i data-lucide='fingerprint' class='w-4 h-4'></i> Identity & Vitals</h3></div>" +
        "<div class='p-5 space-y-4'><div><label class='text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1'>Full Name</label>" +
        "<input type='text' value='" + STATE.profile.name + "' class='w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all' onchange=\"updateProf('name', this.value)\"></div>" +
        "<div class='grid grid-cols-2 gap-4'><div><label class='text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1'>Blood Type</label>" +
        "<select class='w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none' onchange=\"updateProf('blood_type', this.value)\"><option value=''>Select</option>" + bloodTypes + "</select></div>" +
        "<div><label class='text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1'>Nationality</label>" +
        "<input type='text' value='" + (STATE.profile.nationality || '') + "' placeholder='e.g. USA' class='w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none' onchange=\"updateProf('nationality', this.value)\"></div></div>" +
        "<div><label class='text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1'>Known Allergies</label>" +
        "<input type='text' value='" + STATE.profile.allergies.join(', ') + "' placeholder='e.g. Penicillin' class='w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none text-danger placeholder:text-neutral-300' onchange=\"updateProf('allergies', this.value.split(',').map(s=>s.trim()).filter(Boolean))\"></div>" +
        "</div></div>" +
        "<div class='bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-3xl p-8 text-center shadow-[0_15px_40px_rgba(0,0,0,0.2)] relative overflow-hidden'>" +
        "<div class='absolute -top-10 -right-10 opacity-10 transform rotate-12'><i data-lucide='qr-code' class='w-48 h-48'></i></div>" +
        "<h3 class='font-black text-xl mb-1 relative z-10 tracking-tight'>" + t('qr_title') + "</h3><p class='text-[11px] text-neutral-400 mb-6 relative z-10 font-medium uppercase tracking-widest'>Show to clinic staff</p>" +
        "<div class='bg-white p-3 rounded-2xl inline-block mx-auto relative z-10 shadow-float'><div id='qrcode'></div></div>" +
        "<button onclick='generateQR()' class='mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold transition-colors relative z-10 flex items-center gap-2 mx-auto'><i data-lucide='refresh-cw' class='w-4 h-4'></i> Generate QR</button></div></div>";
}

function updateProf(key, value) {
    STATE.profile[key] = value;
    saveProfile();
    showToast('Profile saved', 'success');
}

function generateQR() {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    const data = JSON.stringify({ n: STATE.profile.name, b: STATE.profile.blood_type, a: STATE.profile.allergies, v: "MR1" });
    new QRCode(qrContainer, { text: data, width: 180, height: 180, colorDark: "#111827", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    showToast('Medical QR Updated', 'success');
}

// 5. CHAT (Enhanced with Context)
function viewChat() {
    return "<div class='flex flex-col h-[calc(100vh-140px)] max-w-lg mx-auto bg-white shadow-soft rounded-t-3xl overflow-hidden mt-2 animate-fade-in'>" +
        "<div class='bg-primary/5 p-3 text-[10px] text-primary-dark text-center font-bold tracking-wider uppercase border-b border-primary/10'>AI Navigation Guidance Only</div>" +
        "<div id='chat-messages' class='flex-1 overflow-y-auto p-5 space-y-5 bg-neutral-50/50'>" +
        "<div class='flex gap-3'><div class='w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white flex-shrink-0 shadow-sm'><i data-lucide='sparkles' class='w-4 h-4'></i></div>" +
        "<div class='bg-white border border-neutral-200 p-3.5 rounded-2xl rounded-tl-none text-sm text-neutral-800 shadow-sm'>Hello! I am MediRoute AI. I remember our conversation. How can I assist you with your healthcare needs today?</div></div>" +
        renderChatHistory() +
        "</div>" +
        "<div class='p-3 border-t border-neutral-100 bg-white'>" +
        "<div class='flex gap-2 items-center bg-neutral-50 p-1.5 rounded-full border border-neutral-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all'>" +
        "<input type='text' id='chat-input' class='flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none' placeholder='" + t('chat_placeholder') + "' onkeypress=\"if(event.key==='Enter') sendChat()\">" +
        "<button onclick='sendChat()' class='w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition flex-shrink-0 shadow-sm'><i data-lucide='arrow-up' class='w-5 h-5'></i></button>" +
        "</div></div></div>";
}

function renderChatHistory() {
    if (!STATE.chatHistory.length) return '';
    return STATE.chatHistory.map(msg => {
        if (msg.role === 'user') {
            return "<div class='flex gap-3 justify-end'><div class='bg-neutral-900 text-white p-3.5 rounded-2xl rounded-tr-none text-sm shadow-sm max-w-[85%] font-medium'>" + msg.parts[0].text + "</div></div>";
        } else {
            return "<div class='flex gap-3'><div class='w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white flex-shrink-0 shadow-sm'><i data-lucide='sparkles' class='w-4 h-4'></i></div>" +
                "<div class='bg-white border border-neutral-200 p-3.5 rounded-2xl rounded-tl-none text-sm text-neutral-800 shadow-sm max-w-[85%] leading-relaxed'>" + formatChatText(msg.parts[0].text) + "</div></div>";
        }
    }).join('');
}

function formatChatText(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

async function sendChat() {
    const inputEl = document.getElementById('chat-input');
    const msg = inputEl.value.trim();
    if (!msg) return;
    inputEl.value = '';

    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML += "<div class='flex gap-3 justify-end animate-fade-in'><div class='bg-neutral-900 text-white p-3.5 rounded-2xl rounded-tr-none text-sm shadow-sm max-w-[85%] font-medium'>" + msg + "</div></div>";
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += "<div id='" + loadingId + "' class='flex gap-3 animate-fade-in'><div class='w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white flex-shrink-0 shadow-sm'><i data-lucide='sparkles' class='w-4 h-4'></i></div>" +
        "<div class='bg-white border border-neutral-200 p-4 rounded-2xl rounded-tl-none text-sm flex gap-1 items-center shadow-sm'><div class='w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce'></div><div class='w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce' style='animation-delay: 0.1s'></div><div class='w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce' style='animation-delay: 0.2s'></div></div></div>";
    chatBox.scrollTop = chatBox.scrollHeight;
    lucide.createIcons();

    const sys = "You are MediRoute AI. Language: " + STATE.lang + ". Never diagnose. Keep answers short (under 50 words). Suggest seeking a doctor if unsure. Format text cleanly.";
    const reply = await callGemini(msg, sys, null, null, true);

    document.getElementById(loadingId).remove();

    if (reply) {
        chatBox.innerHTML += "<div class='flex gap-3 animate-fade-in'><div class='w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white flex-shrink-0 shadow-sm'><i data-lucide='sparkles' class='w-4 h-4'></i></div>" +
            "<div class='bg-white border border-neutral-200 p-3.5 rounded-2xl rounded-tl-none text-sm text-neutral-800 shadow-sm max-w-[85%] leading-relaxed'>" + formatChatText(reply) + "</div></div>";
    } else {
        showToast("Connection failed.", "error");
    }
    chatBox.scrollTop = chatBox.scrollHeight;
    lucide.createIcons();
}

// 6. PHARMACY MAP (Location Enabled)
function viewPharmacy() {
    return "<div class='flex flex-col h-[calc(100vh-140px)] w-full relative animate-fade-in'>" +
        "<div id='map-container' class='flex-1 w-full bg-neutral-200 z-0'></div>" +
        "<button onclick='centerMapOnUser()' class='absolute top-4 right-4 z-10 bg-white p-3 rounded-full shadow-float text-primary hover:bg-neutral-50'><i data-lucide='crosshair'></i></button>" +
        "<div class='absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-float z-10 border border-neutral-100'>" +
        "<h3 class='font-bold text-sm mb-3 flex items-center gap-2 tracking-tight text-neutral-900'><i data-lucide='pill' class='w-4 h-4 text-primary'></i> " + t('gen_med_finder') + "</h3>" +
        "<div class='flex gap-2'>" +
        "<input type='text' id='generic-input' placeholder='e.g. Advil' class='flex-1 border border-neutral-200 bg-white rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm'>" +
        "<button onclick='findGeneric()' class='bg-neutral-900 text-white px-5 rounded-xl text-sm font-bold shadow-sm hover:bg-neutral-800 transition'>" + t('search_btn') + "</button>" +
        "</div><div id='generic-result' class='mt-4 hidden text-sm bg-blue-50/50 p-4 rounded-xl border border-blue-100'></div></div></div>";
}

async function initPharmacyMap() {
    if (mapInstance) { mapInstance.remove(); }

    let center = [19.0422, 72.8618];
    const loc = await updateLocation();
    if (loc && loc.lat) center = [loc.lat, loc.lng];

    mapInstance = L.map('map-container', { zoomControl: false }).setView(center, 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);

    DB.pharmacies.forEach(p => {
        L.marker([p.lat, p.lng]).addTo(mapInstance).bindPopup("<b>" + p.name + "</b><br/>" + p.tags.join(', '));
    });
    if (loc && loc.lat) {
        L.marker([loc.lat, loc.lng]).addTo(mapInstance).bindPopup('Your Location').openPopup();
    }
}

function centerMapOnUser() {
    if (mapInstance && STATE.location.lat) {
        mapInstance.setView([STATE.location.lat, STATE.location.lng], 14);
    }
}

async function findGeneric() {
    const input = document.getElementById('generic-input').value;
    if (!input) return;
    const resDiv = document.getElementById('generic-result');
    resDiv.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline"></i> Searching...';
    resDiv.classList.remove('hidden');
    lucide.createIcons();

    const sys = "You are a pharmacist AI. Find the generic equivalent. Reply with JSON { \"generic\": \"Name\", \"info\": \"Brief info\" }";
    const schema = { type: "OBJECT", properties: { generic: { type: "STRING" }, info: { type: "STRING" } } };
    const res = await callGemini(input, sys, schema);

    if (res) {
        resDiv.innerHTML = "<strong>Generic:</strong> " + res.generic + "<br><span class='text-xs text-neutral-500'>" + res.info + "</span>";
    } else {
        resDiv.innerHTML = "Failed to find generic equivalent.";
    }
}

function triggerSOS(force = false) {
    // showToast("🚨 Emergency SOS Triggered! Dispatching nearest ambulance.", "error");
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
}

function viewPrescription() {
    return "<div class='p-10 text-center animate-fade-in'><i data-lucide='scan-line' class='w-16 h-16 mx-auto text-neutral-300 mb-4'></i><h2 class='text-xl font-bold'>Scan Prescription</h2><p class='text-neutral-500 text-sm mt-2'>Feature coming soon.</p></div>";
}

function viewInsurance() {
    return "<div class='p-10 text-center animate-fade-in'><i data-lucide='shield' class='w-16 h-16 mx-auto text-neutral-300 mb-4'></i><h2 class='text-xl font-bold'>Insurance</h2><p class='text-neutral-500 text-sm mt-2'>Feature coming soon.</p></div>";
}

// Boot
renderView(window.location.hash.slice(1) || '/');
updateLocation();