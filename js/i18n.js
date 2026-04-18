// js/i18n.js — Internationalization System
import State from './state.js';

const LANG_MAP = {
  'en': 'en', 'en-US': 'en', 'en-GB': 'en', 'en-AU': 'en',
  'fr': 'fr', 'fr-FR': 'fr', 'fr-CA': 'fr',
  'es': 'es', 'es-ES': 'es', 'es-MX': 'es',
  'de': 'de', 'de-DE': 'de', 'de-AT': 'de',
  'ar': 'ar', 'ar-SA': 'ar', 'ar-EG': 'ar',
  'zh': 'zh', 'zh-CN': 'zh', 'zh-TW': 'zh',
  'ja': 'ja', 'ja-JP': 'ja',
  'ru': 'ru', 'ru-RU': 'ru',
  'pt': 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt',
  'hi': 'hi', 'hi-IN': 'hi'
};

export const CURRENCY_MAP = {
  'en': 'USD', 'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD',
  'fr': 'EUR', 'de': 'EUR', 'es': 'EUR',
  'ar': 'AED', 'zh': 'CNY', 'ja': 'JPY',
  'ru': 'RUB', 'pt': 'BRL', 'hi': 'INR'
};

const RTL_LANGS = ['ar'];

let _translations = {};
let _currentLang = 'en';
let _loadPromise = null;

// ── Translation loader ────────────────────────────────────────────────────
async function loadTranslations() {
  try {
    const res = await fetch('/data/translations.json');
    _translations = await res.json();
  } catch (e) {
    console.warn('Failed to load translations.json, using empty fallback');
    _translations = { en: {} };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Main entry point called by app.js with the target language */
function initI18n(lang) {
  _currentLang = lang || 'en';
  if (!_loadPromise) {
    _loadPromise = loadTranslations().then(() => {
      _currentLang = lang || detectLanguage();
      applyTranslations();
    });
  } else {
    _currentLang = lang || _currentLang;
  }
  if (CURRENCY_MAP[_currentLang] && !State.get('currency')) {
    State.set('currency', CURRENCY_MAP[_currentLang]);
  }
  return _loadPromise;
}

/** Translate a key, with optional fallback string */
function t(key, fallback) {
  return (_translations[_currentLang] && _translations[_currentLang][key])
    || (_translations['en'] && _translations['en'][key])
    || fallback
    || key;
}

/** Apply all [data-i18n] attributes in the DOM */
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text && text !== key) el.textContent = text;
  });

  // RTL support
  document.documentElement.setAttribute('dir', RTL_LANGS.includes(_currentLang) ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', _currentLang);

  // Sync language selector
  document.querySelectorAll('.lang-option').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-lang') === _currentLang);
  });
  const langBtn = document.getElementById('lang-current');
  if (langBtn) {
    const labels = { en: 'EN', fr: 'FR', es: 'ES', de: 'DE', ar: 'AR', zh: '中', ja: 'JP', ru: 'RU', pt: 'PT', hi: 'HI' };
    langBtn.textContent = labels[_currentLang] || _currentLang.toUpperCase();
  }
}

/** Set language and re-translate */
async function setLanguage(lang) {
  if (!_loadPromise) await initI18n(lang);
  else await _loadPromise;
  _currentLang = lang;
  State.set('language', lang);
  State.set('currency', CURRENCY_MAP[lang] || 'USD');
  applyTranslations();
}

function detectLanguage() {
  const saved = State.get('language');
  if (saved && LANG_MAP[saved]) return saved;
  const navLang = navigator.language || 'en';
  const prefix = navLang.split('-')[0];
  return LANG_MAP[navLang] || LANG_MAP[prefix] || 'en';
}

function detectCurrency() {
  const navLang = navigator.language || 'en';
  const prefix = navLang.split('-')[0];
  return CURRENCY_MAP[navLang] || CURRENCY_MAP[prefix] || 'USD';
}

// Expose currentLang as a getter
export { initI18n, t, applyTranslations, setLanguage, detectLanguage, detectCurrency };
export { _currentLang as currentLang };
export default { initI18n, t, applyTranslations, setLanguage, get currentLang() { return _currentLang; } };
