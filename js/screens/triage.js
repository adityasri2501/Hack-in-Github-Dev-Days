// js/screens/triage.js — AI Symptom Triage Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { triageSymptoms } from '../api.js';
import Voice from '../voice.js';
import { speak } from '../voice.js';
import { showToast, navigate } from '../app.js';

const SYMPTOM_CHIPS = ['Fever', 'Chest Pain', 'Headache', 'Stomach Pain', 'Breathing Difficulty', 'Injury', 'Rash', 'Dizziness', 'Nausea', 'Back Pain'];

let activeMode = 'text';
let currentSymptoms = '';

export function render(params = {}) {
  const isEmergency = params.emergency === 'true';
  const isVoice = params.mode === 'voice';
  if (isVoice) activeMode = 'voice';

  return `
    <div class="triage-screen screen-enter">
      <div class="card card-padded" style="margin-bottom:16px;">
        <h1 style="margin-bottom:4px;" data-i18n="triage">Symptom Check</h1>
        <p class="caption" data-i18n="disclaimer">MediRoute provides navigation guidance only, not medical advice.</p>

        ${isEmergency ? `
          <div class="notification-banner danger" style="margin-top:12px;">
            <span>🚨</span>
            <span>Emergency mode — your location has been shared</span>
          </div>
        ` : ''}
      </div>

      <!-- Mode Toggle -->
      <div class="tabs" style="margin-bottom:16px;" role="tablist">
        <button class="tab-btn ${activeMode === 'text' ? 'active' : ''}" id="tab-text" role="tab" aria-selected="${activeMode === 'text'}" data-i18n="type_symptoms">Type Symptoms</button>
        <button class="tab-btn ${activeMode === 'voice' ? 'active' : ''}" id="tab-voice" role="tab" aria-selected="${activeMode === 'voice'}" data-i18n="speak_symptoms">Speak Symptoms</button>
      </div>

      <!-- TEXT MODE -->
      <div id="text-mode" class="card card-padded" style="${activeMode !== 'text' ? 'display:none' : ''}; margin-bottom:16px;">
        <div class="form-group">
          <textarea class="form-textarea" id="symptoms-text" placeholder="${t('describe_symptoms', 'Describe how you are feeling...')}" aria-label="Describe symptoms" style="min-height:140px;"></textarea>
        </div>
        <div class="symptom-chips" id="chip-container" role="group" aria-label="Quick symptom chips">
          ${SYMPTOM_CHIPS.map(chip => `<button class="symptom-chip" data-symptom="${chip}">${chip}</button>`).join('')}
        </div>
        <button class="btn btn-primary btn-full" id="check-btn" style="margin-top:16px;" data-i18n="check_severity">Check Severity</button>
      </div>

      <!-- VOICE MODE -->
      <div id="voice-mode" class="card card-padded" style="${activeMode !== 'voice' ? 'display:none' : ''}; margin-bottom:16px; text-align:center;">
        <p class="caption" style="margin-bottom:20px;">Speak in any language — tap the mic to begin</p>
        
        <button class="mic-btn" id="mic-btn" aria-label="Start voice recording">
          🎤
        </button>
        
        <div id="waveform-container" style="margin-top:16px; display:none;"></div>
        
        <div class="transcript-display" id="transcript-display" data-i18n="listening">${t('listening', 'Listening...')}</div>
        
        <p class="caption" id="mic-status" style="margin-top:8px; color:var(--text-secondary)">Tap mic to start</p>
        <button class="btn btn-primary btn-full" id="voice-submit-btn" style="margin-top:16px; display:none;" data-i18n="check_severity">Check Severity</button>
      </div>

      <!-- RESULT CARD -->
      <div id="triage-result" style="display:none;"></div>

      <!-- Disclaimer -->
      <div class="notification-banner info" style="margin-top:8px;">
        <span>ℹ️</span>
        <span data-i18n="disclaimer">MediRoute provides navigation guidance only, not medical advice. Always consult a qualified doctor.</span>
      </div>
    </div>
  `;
}

export function init(params = {}) {
  // Tab switching
  document.getElementById('tab-text')?.addEventListener('click', () => switchMode('text'));
  document.getElementById('tab-voice')?.addEventListener('click', () => switchMode('voice'));

  // Symptom chips
  document.querySelectorAll('.symptom-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
      const textarea = document.getElementById('symptoms-text');
      const sym = chip.dataset.symptom;
      if (chip.classList.contains('selected')) {
        textarea.value = textarea.value ? textarea.value + ', ' + sym : sym;
      } else {
        textarea.value = textarea.value.replace(new RegExp(',?\\s*' + sym, 'g'), '').trim().replace(/^,/, '').trim();
      }
    });
  });

  // Check button
  document.getElementById('check-btn')?.addEventListener('click', () => {
    const text = document.getElementById('symptoms-text')?.value.trim();
    if (!text) { showToast('Please describe your symptoms first', 'warning'); return; }
    currentSymptoms = text;
    submitTriage(text);
  });

  // Voice mic button
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (Voice.isRecording) {
        Voice.stop();
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎤';
        document.getElementById('mic-status').textContent = 'Tap mic to start';
        document.getElementById('waveform-container').style.display = 'none';
      } else {
        startVoiceRecording();
      }
    });
  }

  // Voice submit
  document.getElementById('voice-submit-btn')?.addEventListener('click', () => {
    if (currentSymptoms) submitTriage(currentSymptoms);
  });

  // If emergency mode, auto-populate with emergency context
  if (params.emergency === 'true') {
    const textarea = document.getElementById('symptoms-text');
    if (textarea) textarea.placeholder = 'Emergency mode — describe your symptoms now...';
  }
}

function switchMode(mode) {
  activeMode = mode;
  document.getElementById('text-mode').style.display = mode === 'text' ? '' : 'none';
  document.getElementById('voice-mode').style.display = mode === 'voice' ? '' : 'none';
  document.getElementById('tab-text').classList.toggle('active', mode === 'text');
  document.getElementById('tab-voice').classList.toggle('active', mode === 'voice');
  document.getElementById('tab-text').setAttribute('aria-selected', mode === 'text');
  document.getElementById('tab-voice').setAttribute('aria-selected', mode === 'voice');
}

function startVoiceRecording() {
  const micBtn = document.getElementById('mic-btn');
  const transcript = document.getElementById('transcript-display');
  const status = document.getElementById('mic-status');
  const waveform = document.getElementById('waveform-container');
  const submitBtn = document.getElementById('voice-submit-btn');

  micBtn.classList.add('recording');
  micBtn.textContent = '⏹';
  status.textContent = t('listening', 'Listening...');
  transcript.textContent = '';
  submitBtn.style.display = 'none';

  // Show waveform
  waveform.style.display = 'flex';
  waveform.appendChild(Voice.createWaveform());

  Voice.start({
    lang: State.get('language'),
    onInterim: (text) => {
      transcript.textContent = text;
      transcript.style.color = 'var(--text-primary)';
      transcript.style.fontStyle = 'normal';
    },
    onResult: (text) => {
      currentSymptoms = text;
      transcript.textContent = text;
      transcript.style.color = 'var(--text-primary)';
      transcript.style.fontStyle = 'normal';
      micBtn.classList.remove('recording');
      micBtn.textContent = '🎤';
      status.textContent = 'Voice captured — submit or re-record';
      waveform.style.display = 'none';
      submitBtn.style.display = 'block';
      // Auto-submit
      setTimeout(() => submitTriage(text), 500);
    },
    onEnd: () => {
      micBtn.classList.remove('recording');
      micBtn.textContent = '🎤';
      waveform.style.display = 'none';
    }
  });
}

async function submitTriage(symptoms) {
  const resultDiv = document.getElementById('triage-result');
  if (!resultDiv) return;

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Analyzing symptoms...</p></div>`;

  const profile = State.profile.get();
  const location = State.get('lastLocation');
  const lang = State.get('language');

  try {
    const result = await triageSymptoms(symptoms, profile, location, lang);
    State.set('triageResult', result);
    renderTriageResult(result, resultDiv, symptoms, lang);
  } catch (e) {
    resultDiv.innerHTML = `<div class="notification-banner danger"><span>⚠️</span><span>Unable to analyze. If you feel unwell, please call 112 immediately.</span></div>`;
  }
}

function renderTriageResult(result, container, symptoms, lang) {
  const { severity, specialist_needed, reasoning, emergency_action, disclaimer } = result;
  const sevLower = severity?.toLowerCase().replace('_', '-') || 'non-urgent';
  const colors = {
    'critical': { bg: '#fff5f5', border: 'var(--danger)', icon: '🚨', class: 'critical' },
    'urgent': { bg: '#fffbf0', border: 'var(--warning)', icon: '⚠️', class: 'urgent' },
    'non-urgent': { bg: '#f0faf4', border: 'var(--success)', icon: '✅', class: 'non-urgent' }
  };
  const c = colors[sevLower] || colors['non-urgent'];
  const sevLabel = t(`severity_${sevLower.replace('-', '_')}`, severity);

  container.innerHTML = `
    <div class="triage-result-card ${c.class}" style="background:${c.bg}; border-color:${c.border};">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <span style="font-size:24px;">${c.icon}</span>
        <div class="severity-badge ${c.class}">
          ${c.icon} ${sevLabel}
        </div>
        <button onclick="readTriageAloud('${reasoning?.replace(/'/g,"\\'")}', '${lang}')" class="btn btn-ghost btn-sm" title="Read aloud">🔊</button>
      </div>

      <div style="margin-bottom:8px;">
        <span class="label" style="color:var(--text-secondary);">Specialist Needed</span>
        <div style="font-size:18px; font-weight:600; margin-top:2px;">${specialist_needed || 'General Physician'}</div>
      </div>

      <p style="font-size:15px; color:var(--text-primary); margin-bottom:16px; line-height:1.6;">${reasoning || ''}</p>

      ${emergency_action ? `
        <div class="notification-banner danger" style="margin-bottom:16px;">
          <span>🚨</span>
          <div>${emergency_action}</div>
        </div>
      ` : ''}

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${severity === 'CRITICAL' ? `
          <a href="tel:112" class="btn btn-danger btn-full" id="call-112-triage">📞 ${t('call_112', 'Call 112 Now')}</a>
        ` : ''}
        <button class="btn btn-primary btn-full" id="find-specialist-btn">
          📍 ${t('find_nearest', 'Find Nearest')} ${specialist_needed || 'Doctor'}
        </button>
      </div>

      <p class="caption" style="margin-top:12px; text-align:center;">${disclaimer || t('disclaimer', '')}</p>
    </div>
  `;

  // Bind find specialist
  document.getElementById('find-specialist-btn')?.addEventListener('click', () => {
    window.location.hash = `#/doctors?specialty=${encodeURIComponent(specialist_needed || '')}`;
  });

  // Speak result if CRITICAL
  if (severity === 'CRITICAL' && window.speechSynthesis) {
    speak(`Emergency! ${reasoning || ''}. Please call 112 immediately.`, lang);
  }
}

// Global helper for read-aloud
window.readTriageAloud = function(text, lang) {
  speak(text, lang);
};
