// js/screens/prescription.js — Prescription OCR + Translate Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { processPrescription } from '../api.js';
import { speak } from '../voice.js';
import { showToast } from '../app.js';

let currentStep = 1;
let uploadedImageData = null;

export function render() {
  return `
    <div class="prescription-screen screen-enter">
      <div class="card card-padded" style="margin-bottom:16px;">
        <h1 data-i18n="prescription">Prescription</h1>
        <p class="caption" data-i18n="prescription_subtitle">Upload a prescription to translate and understand your medications</p>
      </div>

      <!-- Step progress -->
      <div class="step-progress" style="display:flex; gap:0; margin-bottom:16px; background:var(--neutral-100); border-radius:var(--radius-md); overflow:hidden;">
        <div class="step-item active" id="step-1-indicator" style="flex:1;padding:10px;text-align:center;font-size:13px;font-weight:500;background:var(--secondary);color:white;">
          1. Upload
        </div>
        <div class="step-item" id="step-2-indicator" style="flex:1;padding:10px;text-align:center;font-size:13px;font-weight:500;color:var(--text-secondary);">
          2. Processing
        </div>
        <div class="step-item" id="step-3-indicator" style="flex:1;padding:10px;text-align:center;font-size:13px;font-weight:500;color:var(--text-secondary);">
          3. Results
        </div>
      </div>

      <!-- STEP 1: Upload -->
      <div id="step-upload" class="card card-padded" style="margin-bottom:16px;">
        <h3 style="margin-bottom:16px;">📷 Upload Prescription</h3>

        <div id="upload-zone" style="border:2px dashed var(--neutral-200); border-radius:var(--radius-lg); padding:40px 20px; text-align:center; cursor:pointer; transition:all 0.2s; background:var(--neutral-50);">
          <div style="font-size:48px; margin-bottom:12px;">📋</div>
          <p style="font-weight:500; margin-bottom:8px;">Take a photo or upload an image</p>
          <p class="caption">JPG, PNG, PDF supported · Max 10MB</p>
          <div style="display:flex; gap:12px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
            <label for="camera-input" class="btn btn-primary" style="cursor:pointer;">
              📷 Camera
              <input type="file" id="camera-input" accept="image/*" capture="environment" style="display:none;">
            </label>
            <label for="file-input" class="btn btn-secondary" style="cursor:pointer;">
              📁 Browse File
              <input type="file" id="file-input" accept="image/*,.pdf" style="display:none;">
            </label>
          </div>
        </div>

        <!-- Image preview -->
        <div id="image-preview" style="display:none; margin-top:16px;">
          <img id="preview-img" style="max-width:100%; border-radius:var(--radius-md); border:1px solid var(--neutral-200);" alt="Prescription preview">
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="btn btn-primary" id="analyze-btn" style="flex:1;">🔍 Analyze Prescription</button>
            <button class="btn btn-outline" id="retake-btn">🔄 Retake</button>
          </div>
        </div>

        <!-- Demo button -->
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--neutral-200); text-align:center;">
          <p class="caption" style="margin-bottom:8px;">Don't have a prescription handy?</p>
          <button class="btn btn-ghost" id="demo-prescription-btn" style="font-size:13px;">
            🧪 Try Demo Prescription
          </button>
        </div>
      </div>

      <!-- STEP 2: Processing (hidden initially) -->
      <div id="step-processing" style="display:none;">
        <div class="card card-padded" style="text-align:center; margin-bottom:16px;">
          <div class="spinner" style="margin:20px auto;"></div>
          <h3 style="margin-bottom:8px;">Analyzing Prescription</h3>
          <p class="caption" id="processing-status">Reading prescription text...</p>
          <div style="margin-top:16px;">
            <div id="processing-steps" style="text-align:left; max-width:280px; margin:0 auto;">
              <div class="processing-step" id="proc-step-1" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:var(--text-secondary);font-size:14px;">
                <span style="width:20px;">⏳</span> <span>Extracting text from image...</span>
              </div>
              <div class="processing-step" id="proc-step-2" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:var(--text-secondary);font-size:14px; opacity:0.4;">
                <span style="width:20px;">⏳</span> <span>Identifying medications...</span>
              </div>
              <div class="processing-step" id="proc-step-3" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:var(--text-secondary);font-size:14px; opacity:0.4;">
                <span style="width:20px;">⏳</span> <span>Translating instructions...</span>
              </div>
              <div class="processing-step" id="proc-step-4" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:var(--text-secondary);font-size:14px; opacity:0.4;">
                <span style="width:20px;">⏳</span> <span>Checking interactions...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 3: Results (hidden initially) -->
      <div id="step-results" style="display:none;"></div>

      <!-- Disclaimer -->
      <div class="notification-banner info">
        <span>ℹ️</span>
        <span data-i18n="disclaimer">MediRoute provides navigation guidance only. Always confirm with your doctor or pharmacist.</span>
      </div>
    </div>
  `;
}

export function init() {
  setupFileInputs();
  document.getElementById('analyze-btn')?.addEventListener('click', startProcessing);
  document.getElementById('retake-btn')?.addEventListener('click', resetUpload);
  document.getElementById('demo-prescription-btn')?.addEventListener('click', loadDemoMode);

  // Drag and drop
  const zone = document.getElementById('upload-zone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--secondary)'; zone.style.background = '#f0f6ff'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = 'var(--neutral-200)'; zone.style.background = 'var(--neutral-50)'; });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = 'var(--neutral-200)';
      zone.style.background = 'var(--neutral-50)';
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelected(file);
    });
  }
}

function setupFileInputs() {
  ['camera-input', 'file-input'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) handleFileSelected(file);
    });
  });
}

function handleFileSelected(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('File too large. Max 10MB allowed.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageData = e.target.result;
    const img = document.getElementById('preview-img');
    if (img) img.src = uploadedImageData;
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('image-preview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  uploadedImageData = null;
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('step-results').style.display = 'none';
  document.getElementById('step-results').innerHTML = '';
  setStep(1);
}

async function startProcessing() {
  if (!uploadedImageData) return;
  setStep(2);

  const profile = State.profile.get();
  const lang = State.get('language');

  // Animate processing steps
  animateProcessingSteps();

  try {
    const result = await processPrescription(uploadedImageData, profile, lang);
    setStep(3);
    renderResults(result);
  } catch (e) {
    setStep(1);
    showToast('Failed to process prescription. Please try again.', 'error');
  }
}

function animateProcessingSteps() {
  const steps = ['proc-step-1', 'proc-step-2', 'proc-step-3', 'proc-step-4'];
  steps.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.opacity = '1';
      el.style.color = 'var(--text-primary)';
      el.firstElementChild.textContent = '⏳';
      if (i > 0) {
        const prev = document.getElementById(steps[i - 1]);
        if (prev) prev.firstElementChild.textContent = '✅';
      }
    }, i * 900);
  });
}

function loadDemoMode() {
  uploadedImageData = 'demo';
  document.getElementById('upload-zone').style.display = 'none';
  const preview = document.getElementById('image-preview');
  preview.style.display = 'block';

  const img = document.getElementById('preview-img');
  if (img) {
    img.style.background = 'var(--neutral-100)';
    img.style.padding = '20px';
    img.style.minHeight = '120px';
    img.style.display = 'flex';
    img.style.alignItems = 'center';
    img.style.justifyContent = 'center';
    img.alt = 'Demo Prescription';
    img.src = '';
    img.style.display = 'none';
    const demoPlaceholder = document.createElement('div');
    demoPlaceholder.style = 'background:var(--neutral-100);border-radius:var(--radius-md);padding:24px;text-align:center;margin-bottom:12px;';
    demoPlaceholder.innerHTML = '<div style="font-size:36px;margin-bottom:8px;">📋</div><p style="font-weight:500;">Demo: Augmentin 625mg Prescription</p><p class="caption">Dr. Priya Sharma · Apollo Hospital</p>';
    preview.insertBefore(demoPlaceholder, preview.firstChild);
  }
}

function setStep(step) {
  currentStep = step;
  const indicators = ['step-1-indicator', 'step-2-indicator', 'step-3-indicator'];
  indicators.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (i + 1 < step) {
      el.style.background = 'var(--success)';
      el.style.color = 'white';
    } else if (i + 1 === step) {
      el.style.background = 'var(--secondary)';
      el.style.color = 'white';
    } else {
      el.style.background = 'transparent';
      el.style.color = 'var(--text-secondary)';
    }
  });
  document.getElementById('step-upload').style.display = step === 1 ? '' : 'none';
  document.getElementById('step-processing').style.display = step === 2 ? '' : 'none';
  document.getElementById('step-results').style.display = step === 3 ? '' : 'none';
}

function renderResults(result) {
  const container = document.getElementById('step-results');
  if (!container) return;

  const hasInteraction = result.interaction_warning && result.interaction_warning !== null;
  const severityColor = hasInteraction ? 'var(--danger)' : 'var(--success)';

  container.innerHTML = `
    <!-- Main Result Card -->
    <div class="card card-padded" style="margin-bottom:16px; border-left:4px solid var(--secondary);">
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;">
        <div>
          <h2 style="font-size:20px; margin-bottom:4px;">${result.drug_name_local || 'Unknown Medication'}</h2>
          <p class="caption">${t('generic', 'Generic')}: ${result.generic_name || 'N/A'}</p>
        </div>
        <button onclick="window.prescriptionSpeak()" class="btn btn-ghost btn-sm" title="Read aloud">🔊</button>
      </div>

      <div style="display:grid; gap:12px; margin-bottom:16px;">
        <div class="info-row" style="display:flex; gap:12px; align-items:start;">
          <div style="background:var(--neutral-100); border-radius:var(--radius-sm); padding:8px 12px; flex:1;">
            <div class="caption" style="margin-bottom:2px;">${t('home_country_name', 'In Your Country')}</div>
            <div style="font-weight:600;">${result.drug_name_home_country || result.drug_name_local}</div>
          </div>
          <div style="background:var(--neutral-100); border-radius:var(--radius-sm); padding:8px 12px; flex:1;">
            <div class="caption" style="margin-bottom:2px;">${t('pronunciation', 'Pronunciation')}</div>
            <div style="font-weight:600; font-style:italic;">"${result.pronunciation_guide || 'N/A'}"</div>
          </div>
        </div>
      </div>

      <div style="border-top:1px solid var(--neutral-200); padding-top:16px; margin-bottom:16px;">
        <h3 style="margin-bottom:12px; font-size:15px;">💊 ${t('instructions', 'Instructions')}</h3>
        <div style="display:grid; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:18px;">🔢</span>
            <div>
              <span class="caption">${t('dosage', 'Dosage')}: </span>
              <strong>${result.dosage || 'As prescribed'}</strong>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:18px;">🕐</span>
            <div>
              <span class="caption">${t('frequency', 'Frequency')}: </span>
              <strong>${result.frequency || 'As prescribed'}</strong>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:18px;">📅</span>
            <div>
              <span class="caption">${t('duration', 'Duration')}: </span>
              <strong>${result.duration || 'As prescribed'}</strong>
            </div>
          </div>
          ${result.dietary_restrictions ? `
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:18px;">🍽️</span>
            <div>
              <span class="caption">Diet: </span>
              <strong>${result.dietary_restrictions}</strong>
            </div>
          </div>` : ''}
        </div>
      </div>

      ${result.instructions_translated ? `
      <div style="background:var(--neutral-50); border-radius:var(--radius-md); padding:12px; margin-bottom:16px;">
        <p class="caption" style="margin-bottom:4px;">📝 ${t('translated_instructions', 'Translated Instructions')}</p>
        <p style="font-size:14px; line-height:1.6;">${result.instructions_translated}</p>
      </div>` : ''}
    </div>

    <!-- Interaction Check -->
    <div class="card card-padded" style="margin-bottom:16px; border-left:4px solid ${severityColor};">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:24px;">${hasInteraction ? '⚠️' : '✅'}</span>
        <div>
          <h3 style="font-size:15px; color:${severityColor};">
            ${hasInteraction ? t('interaction_warning', 'Drug Interaction Warning') : t('no_interaction', 'No Interactions Detected')}
          </h3>
          ${hasInteraction ? `<p style="font-size:13px; color:var(--danger); margin-top:4px;">${result.interaction_warning}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
      <button class="btn btn-primary" id="set-reminder-btn">
        💊 Set Reminders
      </button>
      <button class="btn btn-secondary" id="save-to-profile-btn">
        💾 Save to Profile
      </button>
    </div>

    <button class="btn btn-outline btn-full" id="scan-another-btn" style="margin-bottom:16px;">
      📷 Scan Another Prescription
    </button>

    <!-- Disclaimer -->
    <p class="caption" style="text-align:center;">${result.disclaimer || t('disclaimer', 'Always confirm with your doctor or pharmacist.')}</p>
  `;

  // Store result for actions
  window._currentPrescriptionResult = result;

  // Bind actions
  document.getElementById('set-reminder-btn')?.addEventListener('click', () => setReminders(result));
  document.getElementById('save-to-profile-btn')?.addEventListener('click', () => saveToProfile(result));
  document.getElementById('scan-another-btn')?.addEventListener('click', resetUpload);

  // Global speaker
  window.prescriptionSpeak = () => {
    const text = `${result.drug_name_local}. ${result.dosage}, ${result.frequency} for ${result.duration}. ${result.instructions_translated || ''}`;
    speak(text, State.get('language'));
  };
}

function setReminders(result) {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser', 'warning');
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      showToast(`Reminders set for ${result.drug_name_local}`, 'success');
      // Schedule a demo notification
      setTimeout(() => {
        new Notification(`💊 ${result.drug_name_local}`, {
          body: `Time to take your medication — ${result.frequency}`,
          icon: '/icons/icon-192.png'
        });
      }, 5000);
    } else {
      showToast('Please enable notifications to set reminders', 'warning');
    }
  });
}

function saveToProfile(result) {
  const med = {
    id: Date.now(),
    name: result.drug_name_local || result.generic_name,
    dosage: result.dosage,
    frequency: result.frequency,
    duration: result.duration,
    instructions: result.instructions_translated,
    addedAt: new Date().toISOString()
  };

  State.profile.addMedication(med);
  showToast(`${med.name} saved to your profile`, 'success');
}
