// js/voice.js — Web Speech API Handler
import { t } from './i18n.js';
import State from './state.js';

let recognition = null;
let isRecording = false;
let onResultCallback = null;
let onInterimCallback = null;
let onEndCallback = null;
let silenceTimer = null;

function isSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function createRecognition(lang) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = lang || State.get('language') || 'en-US';
  rec.maxAlternatives = 1;
  return rec;
}

function start({ onResult, onInterim, onEnd, lang } = {}) {
  if (!isSupported()) {
    if (onEnd) onEnd(null, 'Voice input not supported in this browser');
    return false;
  }

  if (isRecording) stop();

  onResultCallback = onResult;
  onInterimCallback = onInterim;
  onEndCallback = onEnd;

  // Map language code to BCP47 tag
  const langMap = {
    en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
    ar: 'ar-SA', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU',
    pt: 'pt-BR', hi: 'hi-IN'
  };
  const bcp47 = langMap[lang || State.get('language')] || 'en-US';

  recognition = createRecognition(bcp47);
  if (!recognition) return false;

  recognition.onresult = (event) => {
    clearTimeout(silenceTimer);
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join('');
    const isFinal = event.results[event.results.length - 1].isFinal;

    if (isFinal) {
      if (onResultCallback) onResultCallback(transcript);
      stop();
    } else {
      if (onInterimCallback) onInterimCallback(transcript);
      // Auto-stop after 3s of silence
      silenceTimer = setTimeout(() => {
        if (isRecording) {
          const lastTranscript = transcript;
          stop();
          if (lastTranscript && onResultCallback) onResultCallback(lastTranscript);
        }
      }, 3000);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isRecording = false;
    if (onEndCallback) onEndCallback(null, event.error);
  };

  recognition.onend = () => {
    isRecording = false;
    clearTimeout(silenceTimer);
    if (onEndCallback) onEndCallback();
  };

  try {
    recognition.start();
    isRecording = true;
    return true;
  } catch (e) {
    console.error('Failed to start recognition:', e);
    return false;
  }
}

function stop() {
  clearTimeout(silenceTimer);
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
    recognition = null;
  }
  isRecording = false;
}

// Text-to-Speech
function speak(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  const langMap = {
    en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
    ar: 'ar-SA', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU',
    pt: 'pt-BR', hi: 'hi-IN'
  };

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langMap[lang || State.get('language')] || 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// Waveform animation helper
function createWaveform() {
  const div = document.createElement('div');
  div.className = 'voice-waveform';
  div.innerHTML = `
    <div class="waveform-bar" style="height:8px"></div>
    <div class="waveform-bar" style="height:8px"></div>
    <div class="waveform-bar" style="height:8px"></div>
    <div class="waveform-bar" style="height:8px"></div>
    <div class="waveform-bar" style="height:8px"></div>
  `;
  return div;
}

export { start, stop, speak, stopSpeaking, isSupported, createWaveform, isRecording };
export default { start, stop, speak, stopSpeaking, isSupported, createWaveform, get isRecording() { return isRecording; } };
