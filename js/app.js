// js/app.js — Router, App Initialization
import State from './state.js';
import { initI18n, applyTranslations, t } from './i18n.js';

// ── Screen imports ─────────────────────────────────────────────────────────
import * as Home from './screens/home.js';
import * as Triage from './screens/triage.js';
import * as Doctors from './screens/doctors.js';
import * as DoctorDetail from './screens/doctor-detail.js';
import * as Profile from './screens/profile.js';
import * as Pharmacy from './screens/pharmacy.js';
import * as Prescription from './screens/prescription.js';
import * as Chat from './screens/chat.js';
import * as Insurance from './screens/insurance.js';
import * as History from './screens/history.js';
import * as DoctorPortal from './screens/doctor-portal.js';

// ── Route Table ────────────────────────────────────────────────────────────
const routes = [
  { pattern: /^\/$/, screen: Home },
  { pattern: /^\/triage$/, screen: Triage },
  { pattern: /^\/doctors\/([^/]+)$/, screen: DoctorDetail, param: 'id' },
  { pattern: /^\/doctors$/, screen: Doctors },
  { pattern: /^\/profile$/, screen: Profile },
  { pattern: /^\/pharmacy$/, screen: Pharmacy },
  { pattern: /^\/prescription$/, screen: Prescription },
  { pattern: /^\/chat$/, screen: Chat },
  { pattern: /^\/insurance$/, screen: Insurance },
  { pattern: /^\/history$/, screen: History },
  { pattern: /^\/doctor-portal$/, screen: DoctorPortal },
];

const NAV_ITEMS = {
  '/': 'nav-home',
  '/doctors': 'nav-doctors',
  '/chat': 'nav-chat',
  '/pharmacy': 'nav-pharmacy',
  '/profile': 'nav-profile',
};

// ── Router ─────────────────────────────────────────────────────────────────
function parseHash() {
  const raw = window.location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const params = {};
  if (qs) {
    qs.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  return { path: path || '/', params };
}

function matchRoute(path) {
  for (const route of routes) {
    const m = path.match(route.pattern);
    if (m) {
      const routeParams = {};
      if (route.param) routeParams[route.param] = m[1];
      return { screen: route.screen, routeParams };
    }
  }
  return null;
}

export function navigate(hash) {
  window.location.hash = hash;
}

function updateBottomNav(path) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const base = '/' + path.split('/')[1];
  const id = NAV_ITEMS[base] || NAV_ITEMS[path];
  if (id) document.getElementById(id)?.classList.add('active');
}

let currentScreen = null;

async function router() {
  const { path, params } = parseHash();
  const container = document.getElementById('screen-container');
  if (!container) return;

  const matched = matchRoute(path);
  if (!matched) {
    container.innerHTML = `
      <div class="card card-padded" style="text-align:center; margin-top:40px;">
        <div style="font-size:48px; margin-bottom:16px;">🔍</div>
        <h2>Page Not Found</h2>
        <p class="caption" style="margin-bottom:20px;">The page you're looking for doesn't exist.</p>
        <a href="#/" class="btn btn-primary">Go Home</a>
      </div>`;
    return;
  }

  const { screen, routeParams } = matched;
  const allParams = { ...params, ...routeParams };

  // Render screen
  container.innerHTML = screen.render(allParams);
  currentScreen = screen;

  // Apply translations
  applyTranslations();

  // Initialize screen
  if (screen.init) screen.init(allParams);

  // Scroll to top
  window.scrollTo(0, 0);

  // Update bottom nav
  updateBottomNav(path);

  // Scroll into view if hash sub-anchor
  const anchor = window.location.hash.includes('#/') ? null : window.location.hash.slice(1);
  if (anchor) {
    setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 200);
  }
}

// ── Toast System ───────────────────────────────────────────────────────────
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── SOS FAB ────────────────────────────────────────────────────────────────
function initSosFab() {
  const fab = document.getElementById('sos-fab');
  if (!fab) return;
  fab.addEventListener('click', () => {
    // Delegate to home screen handler if available, else open modal directly
    if (fab._handler) {
      fab._handler();
    } else {
      triggerGlobalSOS();
    }
  });
}

async function triggerGlobalSOS() {
  const modal = document.getElementById('emergency-modal');
  const msg = document.getElementById('emergency-msg');
  if (modal) modal.classList.add('open');
  if (msg) msg.textContent = 'Getting your location...';

  let latitude, longitude;
  let locationFound = false;

  try {
    // Attempt 1: GPS
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { 
        timeout: 8000, 
        enableHighAccuracy: true 
      })
    );
    latitude = pos.coords.latitude;
    longitude = pos.coords.longitude;
    locationFound = true;
  } catch (err) {
    console.warn('GPS SOS failed, trying IP fallback...', err);
    try {
      // Attempt 2: IP-based
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.latitude && data.longitude) {
        latitude = data.latitude;
        longitude = data.longitude;
        locationFound = true;
      }
    } catch (ipErr) {
      console.error('All geolocation attempts failed');
    }
  }

  if (locationFound) {
    State.set('lastLocation', { lat: latitude, lng: longitude });
    if (msg) msg.textContent = `📍 Location found (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Notifying contacts...`;

    const mapContainer = document.getElementById('emergency-map-container');
    if (mapContainer && window.L) {
      mapContainer.style.display = 'block';
      setTimeout(() => {
        try {
          const map = L.map('leaflet-map').setView([latitude, longitude], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: 'emergency-user-marker',
              html: '<div style="background:var(--danger); width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 15px rgba(239,68,68,0.5); animation: pulse 1.5s infinite;"></div>',
              iconSize: [22, 22]
            })
          }).addTo(map).bindPopup('<b>🚨 EMERGENCY LOCATION</b>').openPopup();
        } catch (e) { console.warn('Map init error:', e); }
      }, 100);
    }

    setTimeout(() => { window.location.hash = '#/triage?emergency=true'; }, 3000);
  } catch (err) {
    console.warn('SOS Geolocation error:', err);
    if (msg) msg.textContent = 'Location unavailable. Please call 112 directly.';
  }
}

// ── Language Selector ──────────────────────────────────────────────────────
function initLangSelector() {
  const btn = document.getElementById('lang-btn');
  const dropdown = document.getElementById('lang-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });

  dropdown.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = opt.dataset.lang;
      setLanguage(lang);
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      dropdown.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
}

function setLanguage(lang) {
  State.set('language', lang);
  const labels = { en: 'EN', fr: 'FR', es: 'ES', de: 'DE', ar: 'AR', zh: '中', ja: 'JP', ru: 'RU', pt: 'PT', hi: 'HI' };
  const el = document.getElementById('lang-current');
  if (el) el.textContent = labels[lang] || lang.toUpperCase();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  initI18n(lang);
  applyTranslations();
  // Re-render current screen
  router();
}

// ── App Init ───────────────────────────────────────────────────────────────
function init() {
  // Load state
  State.load();

  // Init i18n — detect language
  const savedLang = State.get('language');
  const browserLang = navigator.language?.slice(0, 2) || 'en';
  const supportedLangs = ['en', 'fr', 'es', 'de', 'ar', 'zh', 'ja', 'ru', 'pt', 'hi'];
  const lang = savedLang || (supportedLangs.includes(browserLang) ? browserLang : 'en');

  initI18n(lang);
  State.set('language', lang);

  // Set RTL
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
  }

  // Mark active lang option
  document.querySelectorAll('.lang-option').forEach(o => {
    o.classList.toggle('active', o.dataset.lang === lang);
  });
  const langCurrent = document.getElementById('lang-current');
  const labels = { en: 'EN', fr: 'FR', es: 'ES', de: 'DE', ar: 'AR', zh: '中', ja: 'JP', ru: 'RU', pt: 'PT', hi: 'HI' };
  if (langCurrent) langCurrent.textContent = labels[lang] || lang.toUpperCase();

  // Init UI
  initSosFab();
  initLangSelector();

  // Apply translations to shell elements
  applyTranslations();

  // Start router
  window.addEventListener('hashchange', router);
  router();
}

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export default { navigate, showToast };
