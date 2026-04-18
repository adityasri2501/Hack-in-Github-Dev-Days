// js/screens/profile.js — Patient Profile Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { checkDrugInteraction } from '../api.js';
import { generateMedicalQR, downloadQR } from '../qr.js';
import { showToast } from '../app.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Epilepsy', 'Heart Disease', 'Cancer', 'HIV', 'Thyroid', 'COPD', 'Other'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

let activeTab = 'identity';

export function render(params = {}) {
  const profile = State.profile.get();
  if (params.tab) activeTab = params.tab;

  const tabs = [
    { id: 'identity', label: '👤 Identity' },
    { id: 'medical', label: '🩺 Medical' },
    { id: 'medications', label: '💊 Medications' },
    { id: 'preferences', label: '⚙️ Preferences' },
    { id: 'insurance', label: '🛡 Insurance' },
    { id: 'contacts', label: '📞 Contacts' },
    { id: 'qr', label: '🏥 QR Code' }
  ];

  return `
    <div class="profile-screen screen-enter">
      <!-- Avatar Section -->
      <div class="profile-avatar-section">
        <div class="profile-avatar" id="profile-avatar-btn" title="Upload photo" role="button" aria-label="Upload profile photo">
          ${profile.photo ? `<img src="${profile.photo}" style="width:100%;height:100%;object-fit:cover;" alt="Profile photo"/>` : '👤'}
        </div>
        <h2 style="color:white; font-size:18px; font-weight:600;">${profile.name || 'Your Name'}</h2>
        <p style="color:rgba(255,255,255,0.75); font-size:13px; margin-bottom:12px;">${profile.nationality || ''} ${profile.bloodGroup ? '· Blood: ' + profile.bloodGroup : ''}</p>
        <a href="#/doctor-portal" class="btn" style="background: rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.4); font-size:13px; border-radius: 20px; padding: 6px 16px; text-decoration:none;">👨‍⚕️ Switch to Doctor Portal</a>
        <input type="file" id="photo-upload" accept="image/*" style="display:none;">
      </div>

      <!-- Tabs -->
      <div style="padding: 16px 16px 0; background:white; position:sticky; top:var(--nav-height); z-index:50; border-bottom:1px solid var(--neutral-200);">
        <div class="tabs">
          ${tabs.map(tab => `<button class="tab-btn ${activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>`).join('')}
        </div>
      </div>

      <div class="container" style="padding-top:16px; padding-bottom:16px;" id="profile-tab-content">
        ${renderTab(activeTab, profile)}
      </div>
    </div>
  `;
}

function renderTab(tab, profile) {
  switch (tab) {
    case 'identity': return renderIdentityTab(profile);
    case 'medical': return renderMedicalTab(profile);
    case 'medications': return renderMedicationsTab(profile);
    case 'preferences': return renderPreferencesTab(profile);
    case 'insurance': return renderInsuranceTab(profile);
    case 'contacts': return renderContactsTab(profile);
    case 'qr': return renderQRTab(profile);
    default: return renderIdentityTab(profile);
  }
}

function renderIdentityTab(p) {
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:16px;" data-i18n="identity">Identity</h3>
      <div class="form-group">
        <label class="form-label" data-i18n="full_name">Full Name</label>
        <input type="text" class="form-input" id="p-name" value="${p.name || ''}" placeholder="Your full name">
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="nationality">Nationality</label>
        <input type="text" class="form-input" id="p-nationality" value="${p.nationality || ''}" placeholder="e.g. French, American">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label" data-i18n="date_of_birth">Date of Birth</label>
          <input type="date" class="form-input" id="p-dob" value="${p.dob || ''}">
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="gender">Gender</label>
          <select class="form-select" id="p-gender">
            <option value="">Select</option>
            ${GENDERS.map(g => `<option value="${g}" ${p.gender === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="passport_number">Passport Number (Optional)</label>
        <input type="text" class="form-input" id="p-passport" value="${p.passport || ''}" placeholder="Optional">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label" data-i18n="home_country">Home Country</label>
          <input type="text" class="form-input" id="p-home" value="${p.homeCountry || ''}" placeholder="e.g. France">
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="destination">Current Destination</label>
          <input type="text" class="form-input" id="p-dest" value="${p.destination || 'India'}" placeholder="e.g. Mumbai, India">
        </div>
      </div>
      <button class="btn btn-primary btn-full" id="save-identity">Save Identity</button>
    </div>
  `;
}

function renderMedicalTab(p) {
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:16px;">🩺 Critical Medical Info</h3>
      <div class="form-group">
        <label class="form-label" data-i18n="blood_type">Blood Group</label>
        <select class="form-select" id="p-blood">
          <option value="">Select blood group</option>
          ${BLOOD_GROUPS.map(b => `<option value="${b}" ${p.bloodGroup === b ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label" data-i18n="height">Height (cm)</label>
          <input type="number" class="form-input" id="p-height" value="${p.height || ''}" placeholder="170">
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="weight">Weight (kg)</label>
          <input type="number" class="form-input" id="p-weight" value="${p.weight || ''}" placeholder="70">
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="bmi">BMI</label>
          <input type="text" class="form-input" id="p-bmi" value="${p.height && p.weight ? (p.weight / ((p.height/100)**2)).toFixed(1) : ''}" readonly placeholder="Auto">
        </div>
      </div>

      <div class="divider"></div>
      
      <!-- Allergies -->
      <h3 style="margin-bottom:8px;" data-i18n="allergies">Allergies</h3>
      <div class="allergy-list" id="allergy-list">
        ${(p.allergies || []).map((a, i) => `
          <span class="allergy-pill ${a.severity || 'mild'}">
            ${a.name} (${a.severity || 'mild'})
            <button class="remove-btn" onclick="removeAllergy(${i})" aria-label="Remove ${a.name}">×</button>
          </span>
        `).join('') || '<span class="caption">No allergies added</span>'}
      </div>
      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
        <input type="text" class="form-input" id="allergy-name" placeholder="Drug/Food/Substance" style="flex:2; min-width:120px;">
        <select class="form-select" id="allergy-severity" style="flex:1; min-width:100px;">
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="anaphylactic">Anaphylactic ⚠️</option>
        </select>
        <button class="btn btn-outline" id="add-allergy-btn" data-i18n="add_allergy">+ Add</button>
      </div>

      <div class="divider"></div>

      <!-- Conditions -->
      <h3 style="margin-bottom:8px;" data-i18n="conditions">Medical Conditions</h3>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;" id="conditions-list">
        ${CONDITIONS.map(c => `
          <label style="cursor:pointer;">
            <input type="checkbox" ${(p.conditions || []).includes(c) ? 'checked' : ''} value="${c}" class="condition-check" style="margin-right:4px;" aria-label="${c}"> ${c}
          </label>
        `).join('')}
      </div>

      <button class="btn btn-primary btn-full" id="save-medical">Save Medical Info</button>
    </div>
  `;
}

function renderMedicationsTab(p) {
  return `
    <div id="drug-warning" style="display:none; margin-bottom:16px;"></div>
    <div class="card card-padded" style="margin-bottom:16px;">
      <div class="section-header">
        <h3 data-i18n="medications">Medications</h3>
      </div>
      <div id="meds-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
        ${(p.medications || []).map((m, i) => `
          <div class="medication-card">
            <div class="med-icon">💊</div>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:14px;">${m.name} ${m.dosage || ''}</div>
              <div class="caption">${m.frequency || ''} · ${m.duration || ''}</div>
              ${m.prescribingDoctor ? `<div class="caption">Dr. ${m.prescribingDoctor}</div>` : ''}
            </div>
            <button onclick="removeMedication(${i})" class="btn btn-ghost btn-sm" style="color:var(--danger);">Remove</button>
          </div>
        `).join('') || '<p class="caption">No medications added</p>'}
      </div>

      <h3 style="margin-bottom:12px;">Add Medication</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label class="form-label">Drug Name</label>
          <input type="text" class="form-input" id="med-name" placeholder="e.g. Metformin">
        </div>
        <div class="form-group">
          <label class="form-label">Dosage</label>
          <input type="text" class="form-input" id="med-dosage" placeholder="e.g. 500mg">
        </div>
        <div class="form-group">
          <label class="form-label">Frequency</label>
          <input type="text" class="form-input" id="med-freq" placeholder="e.g. Twice daily">
        </div>
        <div class="form-group">
          <label class="form-label">Duration</label>
          <input type="text" class="form-input" id="med-duration" placeholder="e.g. 7 days">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Prescribing Doctor (optional)</label>
        <input type="text" class="form-input" id="med-doctor" placeholder="Dr. Smith">
      </div>
      <button class="btn btn-primary btn-full" id="add-med-btn">+ Add Medication</button>
    </div>
  `;
}

function renderPreferencesTab(p) {
  const prefs = p.preferences || {};
  const prefItems = [
    { key: 'vegetarianCapsules', label: '🥦 Vegetarian capsules only (no gelatin)' },
    { key: 'halalGelatin', label: '☪️ Halal-certified gelatin required' },
    { key: 'noAnimalIngredients', label: '🐮 No animal-derived ingredients' },
    { key: 'liquidForm', label: '💧 Liquid form preferred' },
    { key: 'genericPreferred', label: '💰 Generic equivalent preferred over branded' }
  ];
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:16px;">⚙️ Medicine Preferences</h3>
      ${prefItems.map(item => `
        <label class="toggle" style="margin-bottom:14px; gap:14px;">
          <input type="checkbox" class="toggle-input pref-check" data-pref="${item.key}" ${prefs[item.key] ? 'checked' : ''} aria-label="${item.label}">
          <div class="toggle-track"><div class="toggle-thumb"></div></div>
          <span style="font-size:14px;">${item.label}</span>
        </label>
      `).join('')}
      <div class="form-group" style="margin-top:8px;">
        <label class="form-label">Additional Drug Sensitivities or Notes</label>
        <textarea class="form-textarea" id="pref-notes" style="min-height:80px;" placeholder="e.g. Sensitive to codeine, avoid NSAIDS...">${prefs.additionalSensitivities || ''}</textarea>
      </div>
      <button class="btn btn-primary btn-full" id="save-prefs">Save Preferences</button>
    </div>
  `;
}

function renderInsuranceTab(p) {
  const ins = p.insurance || {};
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:16px;">🛡 Insurance Details</h3>
      <div class="form-group">
        <label class="form-label">Insurer Name</label>
        <input type="text" class="form-input" id="ins-name" value="${ins.insurer || ''}" placeholder="e.g. Allianz, AXA, Cigna">
      </div>
      <div class="form-group">
        <label class="form-label">Policy Number</label>
        <input type="text" class="form-input" id="ins-policy" value="${ins.policyNumber || ''}" placeholder="POL-XXXXXXXXX">
      </div>
      <div class="form-group">
        <label class="form-label">Coverage Countries</label>
        <input type="text" class="form-input" id="ins-countries" value="${ins.coverageCountries || ''}" placeholder="Worldwide / Asia / etc.">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label">Emergency Hotline</label>
          <input type="tel" class="form-input" id="ins-hotline" value="${ins.emergencyHotline || ''}" placeholder="+1-800-XXX-XXXX">
        </div>
        <div class="form-group">
          <label class="form-label">Pre-Auth Number</label>
          <input type="tel" class="form-input" id="ins-preauth" value="${ins.preAuthNumber || ''}" placeholder="+1-800-XXX-XXXX">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label">Max Coverage (USD)</label>
          <input type="number" class="form-input" id="ins-max" value="${ins.maxClaim || ''}" placeholder="100000">
        </div>
        <div class="form-group">
          <label class="form-label">Deductible (USD)</label>
          <input type="number" class="form-input" id="ins-deductible" value="${ins.deductible || ''}" placeholder="250">
        </div>
      </div>
      <button class="btn btn-primary btn-full" id="save-insurance">Save Insurance</button>
    </div>
    ${ins.insurer ? `
      <div style="margin-top:16px;">
        <a href="#/doctors?insurance=${encodeURIComponent(ins.insurer)}" class="btn btn-outline btn-full">
          🔍 Find doctors accepting ${ins.insurer}
        </a>
      </div>
    ` : ''}
  `;
}

function renderContactsTab(p) {
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:4px;" data-i18n="emergency_contacts">Emergency Contacts</h3>
      <p class="caption" style="margin-bottom:16px;">These contacts will be automatically notified when you tap SOS</p>
      <div id="contacts-list" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
        ${(p.emergencyContacts || []).map((c, i) => `
          <div class="card card-padded" style="background:var(--neutral-50);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="font-weight:600;">${c.name}</div>
                <div class="caption">${c.relationship}</div>
                <a href="tel:${c.phone}" style="font-size:14px; color:var(--secondary);">${c.phone}</a>
              </div>
              <button onclick="removeContact(${i})" class="btn btn-ghost btn-sm" style="color:var(--danger);">Remove</button>
            </div>
          </div>
        `).join('') || '<p class="caption">No emergency contacts added</p>'}
      </div>
      ${(p.emergencyContacts || []).length < 3 ? `
        <h3 style="margin-bottom:12px;">Add Contact</h3>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" id="contact-name" placeholder="John Doe">
        </div>
        <div class="form-group">
          <label class="form-label">Relationship</label>
          <input type="text" class="form-input" id="contact-rel" placeholder="Spouse, Parent, Friend">
        </div>
        <div class="form-group">
          <label class="form-label">Phone (with country code)</label>
          <input type="tel" class="form-input" id="contact-phone" placeholder="+44 7700 000000">
        </div>
        <button class="btn btn-primary btn-full" id="add-contact-btn">+ Add Emergency Contact</button>
      ` : '<p class="caption">Maximum 3 emergency contacts allowed</p>'}
    </div>
  `;
}

function renderQRTab(p) {
  const hasData = p.bloodGroup || (p.allergies?.length > 0) || (p.conditions?.length > 0);
  return `
    <div class="qr-container" style="margin-bottom:16px;">
      <div class="qr-title">🏥 Medical QR Code</div>
      ${hasData ? `
        <div id="qr-canvas" style="display:flex; justify-content:center; margin-bottom:16px;"></div>
        <p style="font-size:14px; color:var(--text-secondary); margin-bottom:12px;" data-i18n="show_qr">Show this to clinic staff on arrival — no words needed</p>
        <div class="qr-summary">
          ${p.bloodGroup ? `<span class="qr-info-pill">Blood: ${p.bloodGroup}</span>` : ''}
          ${(p.allergies || []).map(a => `<span class="qr-info-pill" style="background:var(--danger-light);color:var(--danger);">${a.name}</span>`).join('')}
          ${(p.conditions || []).filter(c => c).map(c => `<span class="qr-info-pill">${c}</span>`).join('')}
        </div>
        <div style="display:flex; gap:8px; margin-top:16px;">
          <button class="btn btn-outline" style="flex:1;" id="retranslate-qr" data-i18n="retranslate">🔄 Retranslate</button>
          <button class="btn btn-primary" style="flex:1;" id="download-qr" data-i18n="download_qr">📥 Download</button>
        </div>
      ` : `
        <div class="empty-state" style="padding:24px;">
          <div class="empty-icon">🏥</div>
          <div class="empty-title">Complete Your Profile</div>
          <div class="empty-desc">Add blood type, allergies, and conditions to generate your Medical QR</div>
          <button class="btn btn-primary" onclick="switchProfileTab('medical')" style="margin-top:12px;">Complete Medical Info</button>
        </div>
      `}
    </div>
  `;
}

export function init(params = {}) {
  if (params.tab) {
    activeTab = params.tab;
  }

  // Tab switching
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
      const content = document.getElementById('profile-tab-content');
      const profile = State.profile.get();
      if (content) {
        content.innerHTML = renderTab(activeTab, profile);
        initTabHandlers(activeTab, profile);
      }
    });
  });

  const profile = State.profile.get();
  initTabHandlers(activeTab, profile);

  // Photo upload
  document.getElementById('profile-avatar-btn')?.addEventListener('click', () => {
    document.getElementById('photo-upload')?.click();
  });
  document.getElementById('photo-upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      State.profile.update({ photo: ev.target.result });
      const avatar = document.getElementById('profile-avatar-btn');
      if (avatar) avatar.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="Profile photo"/>`;
      showToast('Photo saved', 'success');
    };
    reader.readAsDataURL(file);
  });
}

function initTabHandlers(tab, profile) {
  switch (tab) {
    case 'identity': initIdentityHandlers(); break;
    case 'medical': initMedicalHandlers(); break;
    case 'medications': initMedicationsHandlers(); break;
    case 'preferences': initPrefsHandlers(); break;
    case 'insurance': initInsuranceHandlers(); break;
    case 'contacts': initContactsHandlers(); break;
    case 'qr': initQRHandlers(profile); break;
  }
}

function initIdentityHandlers() {
  document.getElementById('save-identity')?.addEventListener('click', () => {
    State.profile.update({
      name: document.getElementById('p-name')?.value || '',
      nationality: document.getElementById('p-nationality')?.value || '',
      dob: document.getElementById('p-dob')?.value || '',
      gender: document.getElementById('p-gender')?.value || '',
      passport: document.getElementById('p-passport')?.value || '',
      homeCountry: document.getElementById('p-home')?.value || '',
      destination: document.getElementById('p-dest')?.value || ''
    });
    showToast('Identity saved ✓', 'success');
  });
}

function initMedicalHandlers() {
  const heightEl = document.getElementById('p-height');
  const weightEl = document.getElementById('p-weight');
  const bmiEl = document.getElementById('p-bmi');
  
  [heightEl, weightEl].forEach(el => el?.addEventListener('input', () => {
    const h = parseFloat(heightEl?.value || 0);
    const w = parseFloat(weightEl?.value || 0);
    if (h > 0 && w > 0 && bmiEl) bmiEl.value = (w / ((h/100)**2)).toFixed(1);
  }));

  document.getElementById('add-allergy-btn')?.addEventListener('click', () => {
    const name = document.getElementById('allergy-name')?.value.trim();
    const severity = document.getElementById('allergy-severity')?.value;
    if (!name) { showToast('Enter allergy name', 'warning'); return; }
    State.profile.addAllergy({ name, severity });
    refreshAllergyList();
    document.getElementById('allergy-name').value = '';
    showToast('Allergy added', 'success');
  });

  document.getElementById('save-medical')?.addEventListener('click', () => {
    const selectedConditions = [...document.querySelectorAll('.condition-check:checked')].map(el => el.value);
    State.profile.update({
      bloodGroup: document.getElementById('p-blood')?.value || '',
      height: document.getElementById('p-height')?.value || '',
      weight: document.getElementById('p-weight')?.value || '',
      conditions: selectedConditions
    });
    showToast('Medical info saved ✓', 'success');
  });
}

function refreshAllergyList() {
  const list = document.getElementById('allergy-list');
  const allergies = State.profile.get().allergies || [];
  if (list) {
    list.innerHTML = allergies.length ? allergies.map((a, i) => `
      <span class="allergy-pill ${a.severity || 'mild'}">
        ${a.name} (${a.severity || 'mild'})
        <button class="remove-btn" onclick="removeAllergy(${i})" aria-label="Remove ${a.name}">×</button>
      </span>
    `).join('') : '<span class="caption">No allergies added</span>';
  }
}

async function initMedicationsHandlers() {
  document.getElementById('add-med-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('med-name')?.value.trim();
    const dosage = document.getElementById('med-dosage')?.value.trim();
    const frequency = document.getElementById('med-freq')?.value.trim();
    const duration = document.getElementById('med-duration')?.value.trim();
    const doctor = document.getElementById('med-doctor')?.value.trim();
    
    if (!name) { showToast('Enter medication name', 'warning'); return; }

    // Drug interaction check
    const currentMeds = State.profile.get().medications || [];
    if (currentMeds.length > 0) {
      const btn = document.getElementById('add-med-btn');
      if (btn) { btn.textContent = '⏳ Checking interactions...'; btn.disabled = true; }
      
      const result = await checkDrugInteraction({ name, dosage }, currentMeds, State.get('language')).catch(() => null);
      
      if (btn) { btn.textContent = '+ Add Medication'; btn.disabled = false; }
      
      if (result?.interaction_found && result.severity !== 'none') {
        const warning = document.getElementById('drug-warning');
        if (warning) {
          warning.style.display = 'block';
          warning.innerHTML = `<div class="notification-banner ${result.severity === 'severe' ? 'danger' : 'warning'}">
            <span>⚠️</span><div><strong>Drug Interaction ${result.severity.toUpperCase()}:</strong> ${result.warning}<br><em>${result.recommendation}</em></div>
          </div>`;
        }
        if (result.severity === 'severe') {
          showToast('SEVERE drug interaction detected!', 'error');
          return;
        }
      }
    }

    State.profile.addMedication({ name, dosage, frequency, duration, prescribingDoctor: doctor });
    
    // Refresh meds list
    const meds = State.profile.get().medications || [];
    const medsList = document.getElementById('meds-list');
    if (medsList) {
      medsList.innerHTML = meds.map((m, i) => `
        <div class="medication-card">
          <div class="med-icon">💊</div>
          <div style="flex:1;"><div style="font-weight:600;font-size:14px;">${m.name} ${m.dosage || ''}</div><div class="caption">${m.frequency || ''}</div></div>
          <button onclick="removeMedication(${i})" class="btn btn-ghost btn-sm" style="color:var(--danger);">Remove</button>
        </div>
      `).join('');
    }
    
    document.getElementById('med-name').value = '';
    document.getElementById('med-dosage').value = '';
    document.getElementById('med-freq').value = '';
    document.getElementById('med-duration').value = '';
    document.getElementById('med-doctor').value = '';
    showToast(`${name} added to medications`, 'success');
  });
}

function initPrefsHandlers() {
  document.getElementById('save-prefs')?.addEventListener('click', () => {
    const prefs = {};
    document.querySelectorAll('.pref-check').forEach(el => { prefs[el.dataset.pref] = el.checked; });
    prefs.additionalSensitivities = document.getElementById('pref-notes')?.value || '';
    State.profile.update({ preferences: prefs });
    showToast('Preferences saved ✓', 'success');
  });
}

function initInsuranceHandlers() {
  document.getElementById('save-insurance')?.addEventListener('click', () => {
    State.profile.update({
      insurance: {
        insurer: document.getElementById('ins-name')?.value || '',
        policyNumber: document.getElementById('ins-policy')?.value || '',
        coverageCountries: document.getElementById('ins-countries')?.value || '',
        emergencyHotline: document.getElementById('ins-hotline')?.value || '',
        preAuthNumber: document.getElementById('ins-preauth')?.value || '',
        maxClaim: document.getElementById('ins-max')?.value || '',
        deductible: document.getElementById('ins-deductible')?.value || ''
      }
    });
    showToast('Insurance info saved ✓', 'success');
  });
}

function initContactsHandlers() {
  document.getElementById('add-contact-btn')?.addEventListener('click', () => {
    const name = document.getElementById('contact-name')?.value.trim();
    const relationship = document.getElementById('contact-rel')?.value.trim();
    const phone = document.getElementById('contact-phone')?.value.trim();
    if (!name || !phone) { showToast('Name and phone are required', 'warning'); return; }
    State.profile.addContact({ name, relationship, phone });
    showToast('Emergency contact added ✓', 'success');
    const content = document.getElementById('profile-tab-content');
    const profile = State.profile.get();
    if (content) {
      content.innerHTML = renderTab('contacts', profile);
      initTabHandlers('contacts', profile);
    }
  });
}

async function initQRHandlers(profile) {
  const canvas = document.getElementById('qr-canvas');
  if (canvas) {
    await generateMedicalQR(profile, State.get('language'), canvas);
  }
  document.getElementById('download-qr')?.addEventListener('click', () => {
    downloadQR(document.getElementById('qr-canvas'), 'mediroute_medical_qr.png');
    showToast('QR Code downloaded', 'success');
  });
  document.getElementById('retranslate-qr')?.addEventListener('click', async () => {
    const canvas = document.getElementById('qr-canvas');
    const profile = State.profile.get();
    if (canvas) await generateMedicalQR(profile, State.get('language'), canvas);
    showToast('QR retranslated', 'success');
  });
}

// Global helpers
window.removeAllergy = (index) => {
  State.profile.removeAllergy(index);
  refreshAllergyList();
  showToast('Allergy removed', 'success');
};
window.removeMedication = (index) => {
  State.profile.removeMedication(index);
  showToast('Medication removed', 'success');
  const profile = State.profile.get();
  const content = document.getElementById('profile-tab-content');
  if (content) { content.innerHTML = renderTab('medications', profile); initTabHandlers('medications', profile); }
};
window.removeContact = (index) => {
  State.profile.removeContact(index);
  showToast('Contact removed', 'success');
  const profile = State.profile.get();
  const content = document.getElementById('profile-tab-content');
  if (content) { content.innerHTML = renderTab('contacts', profile); initTabHandlers('contacts', profile); }
};
window.switchProfileTab = (tab) => {
  activeTab = tab;
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  if (btn) btn.click();
};
