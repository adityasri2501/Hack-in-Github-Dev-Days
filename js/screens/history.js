// js/screens/history.js — Visit History Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { showToast } from '../app.js';

const SAMPLE_VISITS = [
  {
    id: 'v001',
    date: '2025-04-12',
    doctorName: 'Dr. Priya Sharma',
    specialty: 'Cardiology',
    clinic: 'Apollo Hospital, Mumbai',
    diagnosis: 'Hypertensive urgency (BP 180/110)',
    diagnosisSimple: 'High blood pressure that needed urgent attention',
    medications: ['Amlodipine 5mg twice daily', 'Aspirin 75mg once daily'],
    consultationFee: 1200,
    labFee: 1800,
    pharmacyFee: 350,
    totalAmount: 3350,
    insuranceClaimed: 2345,
    claimStatus: 'Approved',
    claimRef: 'CLM-2025-04129',
    notes: 'Patient presented with severe headache and elevated BP. ECG normal. Started on antihypertensives.',
    aiSummary: {
      what: 'Your blood pressure was very high (180/110 mmHg). This is called hypertensive urgency and needed immediate treatment to prevent serious complications like stroke.',
      take: 'Amlodipine 5mg — take one tablet twice daily (morning and evening). Aspirin 75mg — take one tablet daily with food.',
      avoid: 'Avoid salty foods, caffeine, and alcohol. Do not skip your BP medication.',
      followUp: 'See a cardiologist within 2 weeks or as soon as you return home.',
      warningSigns: 'Seek emergency care if: severe headache, vision changes, chest pain, weakness, or difficulty speaking.'
    },
    flag: '🇫🇷',
    doctorLang: 'English, French'
  },
  {
    id: 'v002',
    date: '2025-03-28',
    doctorName: 'Dr. Ananya Krishnan',
    specialty: 'Dermatology',
    clinic: 'Fortis Hospital, Bangalore',
    diagnosis: 'Contact dermatitis',
    diagnosisSimple: 'Skin reaction likely from local plants or soap',
    medications: ['Hydrocortisone cream 1% apply twice daily', 'Cetirizine 10mg once daily'],
    consultationFee: 800,
    labFee: 0,
    pharmacyFee: 220,
    totalAmount: 1020,
    insuranceClaimed: 714,
    claimStatus: 'Pending',
    claimRef: 'CLM-2025-03887',
    notes: 'Mild allergic skin reaction on forearms. No systemic involvement.',
    aiSummary: {
      what: 'You have contact dermatitis — a skin rash caused by touching something you\'re allergic to, possibly a local plant, fabric, or soap.',
      take: 'Apply hydrocortisone cream to the rash twice daily (morning and evening). Take cetirizine (antihistamine) once daily to reduce itching.',
      avoid: 'Avoid scratching the area. Do not use perfumed soaps or harsh detergents. Try to identify and avoid the trigger substance.',
      followUp: 'The rash should improve in 3–5 days. If it spreads or worsens, see a dermatologist again.',
      warningSigns: 'Seek care if: rash spreads rapidly, you develop difficulty breathing, or severe swelling (especially around face).'
    },
    flag: '🇩🇪',
    doctorLang: 'English, German'
  }
];

export function render() {
  const storedVisits = State.get('visits') || [];
  const visits = storedVisits.length > 0 ? storedVisits : SAMPLE_VISITS;

  return `
    <div class="history-screen screen-enter">
      <div class="card card-padded" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1 data-i18n="history">Visit History</h1>
            <p class="caption">${visits.length} visit${visits.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <button class="btn btn-outline btn-sm" id="add-visit-btn">+ Log Visit</button>
        </div>
      </div>

      ${visits.length === 0 ? `
        <div class="card card-padded" style="text-align:center; padding:48px 24px;">
          <div style="font-size:56px; margin-bottom:16px;">🩺</div>
          <h3 style="margin-bottom:8px;">No Visits Yet</h3>
          <p class="caption" style="margin-bottom:20px;">Your medical visit history will appear here after logging appointments.</p>
          <button class="btn btn-primary" id="log-first-visit-btn">Log Your First Visit</button>
        </div>
      ` : `
        <!-- Timeline -->
        <div class="visit-timeline" style="position:relative; padding-left:24px;">
          ${visits.map((v, i) => renderVisitCard(v, i)).join('')}
        </div>
      `}

      <!-- Log Visit Modal -->
      <div id="log-visit-modal" style="display:none; margin-top:16px;">
        ${renderLogVisitForm()}
      </div>
    </div>
  `;
}

function renderVisitCard(v, index) {
  const date = new Date(v.date);
  const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const statusColor = v.claimStatus === 'Approved' ? 'var(--success)' : v.claimStatus === 'Pending' ? 'var(--warning)' : 'var(--text-secondary)';

  return `
    <div style="position:relative; margin-bottom:24px;">
      <!-- Timeline dot -->
      <div style="position:absolute; left:-24px; top:20px; width:12px; height:12px; border-radius:50%; background:var(--secondary); border:2px solid white; box-shadow:0 0 0 2px var(--secondary);"></div>
      ${index < 1 ? '' : '<div style="position:absolute; left:-19px; top:-24px; width:2px; height:24px; background:var(--neutral-200);"></div>'}

      <div class="card card-padded visit-card" style="cursor:default;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
          <div>
            <div style="font-weight:600; font-size:16px;">${v.doctorName}</div>
            <div class="caption">${v.specialty} · ${v.clinic}</div>
            <div class="caption" style="margin-top:2px;">📅 ${dateStr}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600; color:var(--secondary);">₹${(v.totalAmount || 0).toLocaleString()}</div>
            ${v.claimRef ? `<div class="caption" style="color:${statusColor};">${v.claimStatus || 'N/A'}</div>` : ''}
          </div>
        </div>

        <!-- Diagnosis -->
        <div style="background:var(--neutral-50); border-radius:var(--radius-sm); padding:10px; margin-bottom:12px;">
          <div class="caption" style="margin-bottom:2px;">Diagnosis</div>
          <div style="font-weight:500; font-size:14px;">${v.diagnosis}</div>
          ${v.diagnosisSimple ? `<div style="font-size:13px; color:var(--text-secondary); margin-top:2px;">${v.diagnosisSimple}</div>` : ''}
        </div>

        <!-- Medications -->
        ${v.medications?.length ? `
          <div style="margin-bottom:12px;">
            <div class="caption" style="margin-bottom:6px;">Medications</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${v.medications.map(m => `<span style="background:var(--neutral-100); border-radius:20px; padding:3px 10px; font-size:12px;">💊 ${m}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Cost breakdown -->
        ${v.insuranceClaimed ? `
          <div style="display:flex; gap:8px; margin-bottom:12px; font-size:12px;">
            <div style="flex:1; background:#f0faf4; border-radius:var(--radius-sm); padding:8px; text-align:center;">
              <div class="caption">Claimed</div>
              <div style="font-weight:600; color:var(--success);">₹${v.insuranceClaimed.toLocaleString()}</div>
            </div>
            <div style="flex:1; background:var(--neutral-50); border-radius:var(--radius-sm); padding:8px; text-align:center;">
              <div class="caption">Out of Pocket</div>
              <div style="font-weight:600;">₹${(v.totalAmount - v.insuranceClaimed).toLocaleString()}</div>
            </div>
            ${v.claimRef ? `
              <div style="flex:1; background:var(--neutral-50); border-radius:var(--radius-sm); padding:8px; text-align:center;">
                <div class="caption">Claim Ref</div>
                <div style="font-weight:600; font-size:11px;">${v.claimRef}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- AI Summary -->
        ${v.aiSummary ? `
          <div style="border-top:1px solid var(--neutral-200); padding-top:12px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="font-weight:500; font-size:14px; display:flex; align-items:center; gap:6px;">
                🤖 AI Visit Summary
              </div>
              <button class="btn btn-ghost btn-sm" onclick="toggleSummary('${v.id}')">Show / Hide</button>
            </div>
            <div id="summary-${v.id}" style="display:none;">
              <div style="display:grid; gap:10px;">
                ${[
                  { icon: '🩺', label: 'What you have', text: v.aiSummary.what },
                  { icon: '💊', label: 'What to take', text: v.aiSummary.take },
                  { icon: '🚫', label: 'What to avoid', text: v.aiSummary.avoid },
                  { icon: '📅', label: 'Follow-up', text: v.aiSummary.followUp },
                  { icon: '🚨', label: 'Warning signs', text: v.aiSummary.warningSigns },
                ].map(item => `
                  <div style="display:flex; gap:10px; background:var(--neutral-50); border-radius:var(--radius-sm); padding:10px;">
                    <span style="font-size:16px; flex-shrink:0;">${item.icon}</span>
                    <div>
                      <div style="font-weight:600; font-size:12px; margin-bottom:2px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary);">${item.label}</div>
                      <div style="font-size:13px; line-height:1.5;">${item.text}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Actions -->
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="viewFullSummary('${v.id}')">📄 Full Summary</button>
          <button class="btn btn-outline btn-sm" onclick="shareWithDoctor('${v.id}')">🔗 Share</button>
          ${v.claimRef ? `<a href="#/insurance" class="btn btn-ghost btn-sm">🧾 View Invoice</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderLogVisitForm() {
  return `
    <div class="card card-padded">
      <h3 style="margin-bottom:16px;">📝 Log New Visit</h3>
      <div class="form-group">
        <label class="form-label">Doctor Name</label>
        <input type="text" class="form-input" id="lv-doctor" placeholder="Dr. Name">
      </div>
      <div class="form-group">
        <label class="form-label">Specialty</label>
        <input type="text" class="form-input" id="lv-specialty" placeholder="Cardiology">
      </div>
      <div class="form-group">
        <label class="form-label">Clinic / Hospital</label>
        <input type="text" class="form-input" id="lv-clinic" placeholder="Hospital Name">
      </div>
      <div class="form-group">
        <label class="form-label">Date of Visit</label>
        <input type="date" class="form-input" id="lv-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Diagnosis (in your own words)</label>
        <textarea class="form-textarea" id="lv-diagnosis" placeholder="What did the doctor say you have?"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Total Cost (₹)</label>
        <input type="number" class="form-input" id="lv-cost" placeholder="0">
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" style="flex:1;" id="save-visit-btn">💾 Save Visit</button>
        <button class="btn btn-outline" id="cancel-visit-btn">Cancel</button>
      </div>
    </div>
  `;
}

export function init() {
  document.getElementById('add-visit-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('log-visit-modal');
    if (modal) {
      modal.style.display = modal.style.display === 'none' ? '' : 'none';
      modal.scrollIntoView({ behavior: 'smooth' });
    }
  });

  document.getElementById('log-first-visit-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('log-visit-modal');
    if (modal) { modal.style.display = ''; modal.scrollIntoView({ behavior: 'smooth' }); }
  });

  document.getElementById('save-visit-btn')?.addEventListener('click', saveVisit);
  document.getElementById('cancel-visit-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('log-visit-modal');
    if (modal) modal.style.display = 'none';
  });

  // Global functions
  window.toggleSummary = (id) => {
    const el = document.getElementById(`summary-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
  };

  window.viewFullSummary = (id) => {
    const visits = [...(State.get('visits') || []), ...SAMPLE_VISITS];
    const visit = visits.find(v => v.id === id);
    showToast(visit ? `Viewing full summary for ${visit.doctorName}` : 'Summary not found', 'info');
  };

  window.shareWithDoctor = (id) => {
    const url = encodeURIComponent(window.location.href);
    showToast('Share link copied to clipboard (demo)', 'success');
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
  };
}

function saveVisit() {
  const doctor = document.getElementById('lv-doctor')?.value?.trim();
  if (!doctor) { showToast('Please enter the doctor name', 'warning'); return; }

  const visit = {
    id: 'v' + Date.now(),
    date: document.getElementById('lv-date')?.value || new Date().toISOString().split('T')[0],
    doctorName: doctor,
    specialty: document.getElementById('lv-specialty')?.value || 'General',
    clinic: document.getElementById('lv-clinic')?.value || '',
    diagnosis: document.getElementById('lv-diagnosis')?.value || '',
    totalAmount: parseFloat(document.getElementById('lv-cost')?.value) || 0,
    claimStatus: 'Not Filed',
    medications: [],
    aiSummary: null
  };

  State.profile.addVisit(visit);
  showToast('Visit logged successfully', 'success');

  const modal = document.getElementById('log-visit-modal');
  if (modal) modal.style.display = 'none';

  // Re-render
  setTimeout(() => { window.location.hash = '#/history'; }, 500);
}
