// js/screens/insurance.js — Insurance & Billing Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { predictCost } from '../api.js';
import { showToast } from '../app.js';

let activeTab = 'policy';

export function render() {
  return `
    <div class="insurance-screen screen-enter">
      <div class="card card-padded" style="margin-bottom:16px;">
        <h1 data-i18n="insurance">Insurance & Billing</h1>
        <p class="caption">Manage your coverage, generate invoices, and predict costs</p>
      </div>

      <!-- Tab Bar -->
      <div class="tabs" style="margin-bottom:16px; overflow-x:auto; white-space:nowrap;" role="tablist">
        <button class="tab-btn active" data-tab="policy" role="tab" aria-selected="true">📋 My Policy</button>
        <button class="tab-btn" data-tab="invoice" role="tab" aria-selected="false">🧾 Invoice</button>
        <button class="tab-btn" data-tab="claim" role="tab" aria-selected="false">📦 Claim Package</button>
        <button class="tab-btn" data-tab="predict" role="tab" aria-selected="false">💰 Cost Predictor</button>
      </div>

      <!-- TAB: My Policy -->
      <div id="tab-policy" class="tab-content">
        ${renderPolicyTab()}
      </div>

      <!-- TAB: Invoice Generator -->
      <div id="tab-invoice" class="tab-content" style="display:none;">
        ${renderInvoiceTab()}
      </div>

      <!-- TAB: Claim Package -->
      <div id="tab-claim" class="tab-content" style="display:none;">
        ${renderClaimTab()}
      </div>

      <!-- TAB: Cost Predictor -->
      <div id="tab-predict" class="tab-content" style="display:none;">
        ${renderPredictTab()}
      </div>
    </div>
  `;
}

function renderPolicyTab() {
  const ins = State.profile.get().insurance || {};
  const hasPolicy = ins.policyNumber || ins.insurer;
  return `
    ${hasPolicy ? `
      <div class="card card-padded" style="margin-bottom:16px; border-left:4px solid var(--success);">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
          <div style="width:48px;height:48px;background:var(--neutral-100);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;">🛡️</div>
          <div>
            <div style="font-weight:600;">${ins.insurer || 'Your Insurance'}</div>
            <div class="caption">Policy: ${ins.policyNumber || 'N/A'}</div>
          </div>
          <span class="badge badge-success" style="margin-left:auto;">Active</span>
        </div>
        <div style="display:grid; gap:8px; font-size:14px;">
          ${ins.coverageCountries ? `<div style="display:flex;justify-content:space-between;"><span class="caption">Coverage:</span><span>${ins.coverageCountries}</span></div>` : ''}
          ${ins.emergencyHotline ? `<div style="display:flex;justify-content:space-between;"><span class="caption">Emergency:</span><a href="tel:${ins.emergencyHotline}" style="color:var(--secondary);">${ins.emergencyHotline}</a></div>` : ''}
          ${ins.preAuthNumber ? `<div style="display:flex;justify-content:space-between;"><span class="caption">Pre-Auth:</span><span>${ins.preAuthNumber}</span></div>` : ''}
          ${ins.maxClaim ? `<div style="display:flex;justify-content:space-between;"><span class="caption">Max Claim:</span><span>${ins.maxClaim}</span></div>` : ''}
          ${ins.deductible ? `<div style="display:flex;justify-content:space-between;"><span class="caption">Deductible:</span><span>${ins.deductible}</span></div>` : ''}
        </div>
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--neutral-200);">
          <a href="#/doctors?insurance=${encodeURIComponent(ins.insurer || '')}" class="btn btn-primary btn-full">
            🔍 Find Doctors Accepting ${ins.insurer || 'My Insurance'}
          </a>
        </div>
      </div>

      <div class="card card-padded" style="margin-bottom:16px;">
        <h3 style="margin-bottom:12px; font-size:15px;">💡 Coverage Explained</h3>
        <div style="display:grid; gap:10px; font-size:13px;">
          <div style="padding:10px; background:var(--neutral-50); border-radius:var(--radius-sm);">
            <strong>Cashless Treatment:</strong> Hospital directly bills your insurer. You pay only deductibles/co-pay. Faster, no forms.
          </div>
          <div style="padding:10px; background:var(--neutral-50); border-radius:var(--radius-sm);">
            <strong>Reimbursement:</strong> You pay upfront, then submit documents to claim money back. Slower but wider hospital access.
          </div>
        </div>
      </div>
    ` : `
      <div class="card card-padded" style="text-align:center; margin-bottom:16px;">
        <div style="font-size:48px; margin-bottom:12px;">🛡️</div>
        <h3 style="margin-bottom:8px;">No Insurance Added</h3>
        <p class="caption" style="margin-bottom:20px;">Add your insurance details in your profile to see coverage information here.</p>
        <a href="#/profile" class="btn btn-primary">Add Insurance Details</a>
      </div>
    `}
  `;
}

function renderInvoiceTab() {
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:16px;">🧾 Generate Insurance Invoice</h3>
      <div class="form-group">
        <label class="form-label">Doctor Name</label>
        <input type="text" class="form-input" id="inv-doctor" placeholder="Dr. Priya Sharma">
      </div>
      <div class="form-group">
        <label class="form-label">NMC Registration Number</label>
        <input type="text" class="form-input" id="inv-nmc" placeholder="MH2019-00234">
      </div>
      <div class="form-group">
        <label class="form-label">Clinic / Hospital Name</label>
        <input type="text" class="form-input" id="inv-clinic" placeholder="Apollo Hospital Mumbai">
      </div>
      <div class="form-group">
        <label class="form-label">GST Number (if applicable)</label>
        <input type="text" class="form-input" id="inv-gst" placeholder="27ABCDE1234F1Z5">
      </div>
      <div class="form-group">
        <label class="form-label">Date of Visit</label>
        <input type="date" class="form-input" id="inv-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Diagnosis (plain language)</label>
        <input type="text" class="form-input" id="inv-diagnosis" placeholder="Upper respiratory tract infection">
      </div>
      <div class="form-group">
        <label class="form-label">ICD-10 Code</label>
        <input type="text" class="form-input" id="inv-icd" placeholder="J06.9">
      </div>
      <h4 style="margin-bottom:12px; font-size:14px; color:var(--text-secondary);">ITEMISED COSTS</h4>
      <div class="form-group">
        <label class="form-label">Consultation Fee (₹)</label>
        <input type="number" class="form-input" id="inv-consult" placeholder="1200">
      </div>
      <div class="form-group">
        <label class="form-label">Lab / Investigations (₹)</label>
        <input type="number" class="form-input" id="inv-lab" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Pharmacy (₹)</label>
        <input type="number" class="form-input" id="inv-pharmacy" placeholder="0">
      </div>
      <div class="total-display" id="inv-total-display" style="background:var(--neutral-50); border-radius:var(--radius-md); padding:12px; text-align:center; margin-bottom:16px;">
        <span class="caption">Total: </span>
        <span style="font-size:20px; font-weight:700;">₹0</span>
      </div>
      <button class="btn btn-primary btn-full" id="generate-invoice-btn">📄 Preview & Download Invoice</button>
    </div>

    <!-- Invoice Preview Modal -->
    <div id="invoice-preview" style="display:none; margin-bottom:16px;">
      <div class="card card-padded" style="border:2px solid var(--neutral-200);">
        <div id="invoice-html"></div>
        <div style="display:flex; gap:8px; margin-top:16px;">
          <button class="btn btn-primary" style="flex:1;" id="download-invoice-btn">📥 Download PDF</button>
          <button class="btn btn-outline" style="flex:1;" id="email-invoice-btn">📧 Email</button>
        </div>
      </div>
    </div>
  `;
}

function renderClaimTab() {
  const visits = State.get('visits') || [];
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:8px;">📦 Generate Claim Package</h3>
      <p class="caption" style="margin-bottom:16px;">Select a visit to bundle all documents for your insurance claim.</p>

      ${visits.length > 0 ? `
        ${visits.slice(0, 5).map((v, i) => `
          <div style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--neutral-200); border-radius:var(--radius-md); margin-bottom:8px; cursor:pointer;" onclick="selectClaimVisit(${i})">
            <input type="radio" name="claim-visit" value="${i}" id="cv-${i}">
            <label for="cv-${i}" style="cursor:pointer; flex:1;">
              <div style="font-weight:500;">${v.doctorName || 'Doctor Visit'}</div>
              <div class="caption">${v.date || 'Unknown date'} · ${v.clinic || ''}</div>
            </label>
          </div>
        `).join('')}

        <div id="claim-docs" style="margin-top:16px; display:none;">
          <h4 style="margin-bottom:12px; font-size:14px;">Documents to Include:</h4>
          <div style="display:grid; gap:8px; margin-bottom:16px;">
            <label style="display:flex; align-items:center; gap:10px; font-size:14px;">
              <input type="checkbox" checked> 🧾 Insurance Invoice
            </label>
            <label style="display:flex; align-items:center; gap:10px; font-size:14px;">
              <input type="checkbox" checked> 💊 Prescription
            </label>
            <label style="display:flex; align-items:center; gap:10px; font-size:14px;">
              <input type="checkbox" checked> 🩺 Diagnosis Summary
            </label>
            <label style="display:flex; align-items:center; gap:10px; font-size:14px;">
              <input type="checkbox"> 🔬 Lab Reports
            </label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" style="flex:1;" id="email-claim-btn">📧 Email Claim</button>
            <button class="btn btn-secondary" style="flex:1;" id="download-claim-btn">📥 Download ZIP</button>
          </div>
        </div>
      ` : `
        <div style="text-align:center; padding:32px 0; color:var(--text-secondary);">
          <div style="font-size:48px; margin-bottom:12px;">📋</div>
          <p>No visit history yet.</p>
          <p class="caption">Your visit records will appear here after doctor appointments.</p>
        </div>
      `}
    </div>
  `;
}

function renderPredictTab() {
  const profile = State.profile.get();
  return `
    <div class="card card-padded" style="margin-bottom:16px;">
      <h3 style="margin-bottom:16px;">💰 Cost Predictor</h3>
      <p class="caption" style="margin-bottom:16px;">Get an estimate of your total visit costs before you go.</p>

      <div class="form-group">
        <label class="form-label">Specialist Type</label>
        <select class="form-input" id="pred-specialist">
          <option>General Physician</option>
          <option>Cardiologist</option>
          <option>Dermatologist</option>
          <option>Orthopedist</option>
          <option>ENT Specialist</option>
          <option>Neurologist</option>
          <option>Gastroenterologist</option>
          <option>Gynecologist</option>
          <option>Pediatrician</option>
          <option>Emergency Medicine</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">City</label>
        <select class="form-input" id="pred-city">
          <option>Mumbai</option>
          <option>Delhi</option>
          <option>Bangalore</option>
          <option>Goa</option>
          <option>Jaipur</option>
          <option>Chennai</option>
          <option>Hyderabad</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Your Insurer</label>
        <input type="text" class="form-input" id="pred-insurer" placeholder="e.g. Allianz, AXA, Cigna" value="${profile.insurance?.insurer || ''}">
      </div>
      <button class="btn btn-primary btn-full" id="predict-btn">🔮 Predict My Costs</button>
    </div>

    <div id="predict-result" style="display:none;"></div>
  `;
}

export function init() {
  // Tab switching
  document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Invoice total calculator
  setupInvoiceCalculator();

  // Generate invoice
  document.getElementById('generate-invoice-btn')?.addEventListener('click', generateInvoice);

  // Cost predictor
  document.getElementById('predict-btn')?.addEventListener('click', runCostPredictor);

  // Claim package actions
  document.getElementById('email-claim-btn')?.addEventListener('click', () => showToast('Opening email client...', 'info'));
  document.getElementById('download-claim-btn')?.addEventListener('click', () => showToast('Preparing claim package...', 'info'));

  // Global for visit selection
  window.selectClaimVisit = (i) => {
    document.getElementById('claim-docs').style.display = 'block';
  };
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
    btn.setAttribute('aria-selected', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-content').forEach(el => {
    el.style.display = el.id === `tab-${tab}` ? '' : 'none';
  });
}

function setupInvoiceCalculator() {
  const fields = ['inv-consult', 'inv-lab', 'inv-pharmacy'];
  const update = () => {
    const total = fields.reduce((sum, id) => sum + (parseFloat(document.getElementById(id)?.value) || 0), 0);
    const display = document.getElementById('inv-total-display');
    if (display) display.innerHTML = `<span class="caption">Total: </span><span style="font-size:20px;font-weight:700;">₹${total.toLocaleString()}</span>`;
  };
  fields.forEach(id => document.getElementById(id)?.addEventListener('input', update));
}

function generateInvoice() {
  const getValue = id => document.getElementById(id)?.value || '';
  const consult = parseFloat(getValue('inv-consult')) || 0;
  const lab = parseFloat(getValue('inv-lab')) || 0;
  const pharmacy = parseFloat(getValue('inv-pharmacy')) || 0;
  const total = consult + lab + pharmacy;
  const profile = State.profile.get();

  const invoiceHtml = `
    <div style="font-family:var(--font); font-size:13px;">
      <div style="text-align:center; margin-bottom:16px; padding-bottom:16px; border-bottom:2px solid var(--neutral-900);">
        <div style="font-size:20px; font-weight:700; color:var(--primary);">🏥 MEDICAL INVOICE</div>
        <div style="font-size:11px; color:var(--text-secondary);">Generated by MediRoute</div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; font-size:12px;">
        <div>
          <div style="font-weight:600; margin-bottom:4px;">PROVIDER</div>
          <div>${getValue('inv-doctor') || 'Doctor Name'}</div>
          <div class="caption">NMC: ${getValue('inv-nmc') || 'N/A'}</div>
          <div>${getValue('inv-clinic') || 'Clinic Name'}</div>
          <div class="caption">GST: ${getValue('inv-gst') || 'N/A'}</div>
        </div>
        <div>
          <div style="font-weight:600; margin-bottom:4px;">PATIENT</div>
          <div>${profile.name || 'Patient Name'}</div>
          <div class="caption">Nationality: ${profile.nationality || 'N/A'}</div>
          <div class="caption">Date: ${getValue('inv-date')}</div>
          <div class="caption">Policy: ${profile.insurance?.policyNumber || 'N/A'}</div>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-weight:600; margin-bottom:4px; font-size:12px;">DIAGNOSIS</div>
        <div>${getValue('inv-diagnosis') || 'N/A'}</div>
        <div class="caption">ICD-10: ${getValue('inv-icd') || 'N/A'}</div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:12px;">
        <thead>
          <tr style="background:var(--neutral-100);">
            <th style="padding:6px 8px; text-align:left; border:1px solid var(--neutral-200);">Item</th>
            <th style="padding:6px 8px; text-align:right; border:1px solid var(--neutral-200);">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:6px 8px; border:1px solid var(--neutral-200);">Consultation Fee</td><td style="padding:6px 8px; text-align:right; border:1px solid var(--neutral-200);">₹${consult.toLocaleString()}</td></tr>
          <tr><td style="padding:6px 8px; border:1px solid var(--neutral-200);">Lab / Investigations</td><td style="padding:6px 8px; text-align:right; border:1px solid var(--neutral-200);">₹${lab.toLocaleString()}</td></tr>
          <tr><td style="padding:6px 8px; border:1px solid var(--neutral-200);">Pharmacy</td><td style="padding:6px 8px; text-align:right; border:1px solid var(--neutral-200);">₹${pharmacy.toLocaleString()}</td></tr>
          <tr style="font-weight:700; background:var(--neutral-50);">
            <td style="padding:8px; border:1px solid var(--neutral-200);">TOTAL</td>
            <td style="padding:8px; text-align:right; border:1px solid var(--neutral-200); color:var(--primary);">₹${total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size:10px; color:var(--text-secondary); text-align:center; margin-top:12px;">
        This invoice is generated for insurance claim purposes. All information should be verified by the provider.
      </div>
    </div>
  `;

  const preview = document.getElementById('invoice-preview');
  const html = document.getElementById('invoice-html');
  if (preview && html) {
    html.innerHTML = invoiceHtml;
    preview.style.display = 'block';
    preview.scrollIntoView({ behavior: 'smooth' });
  }

  document.getElementById('download-invoice-btn')?.addEventListener('click', () => {
    showToast('Invoice downloaded (demo). In production, this generates a PDF.', 'success');
  });
  document.getElementById('email-invoice-btn')?.addEventListener('click', () => {
    window.location.href = `mailto:?subject=Medical Invoice - MediRoute&body=Please find attached the medical invoice for insurance claim.`;
  });
}

async function runCostPredictor() {
  const specialist = document.getElementById('pred-specialist')?.value;
  const city = document.getElementById('pred-city')?.value;
  const insurer = document.getElementById('pred-insurer')?.value;
  const lang = State.get('language');

  const btn = document.getElementById('predict-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Predicting...'; }

  const result = document.getElementById('predict-result');
  if (result) {
    result.style.display = 'block';
    result.innerHTML = `<div class="card card-padded"><div class="loading-state"><div class="spinner"></div><p>Getting cost estimates...</p></div></div>`;
  }

  try {
    const data = await predictCost(specialist, city, insurer, lang);
    renderCostPrediction(data, specialist);
  } catch (e) {
    renderCostPrediction({
      consultation_range: '₹800–₹1,500',
      lab_range: '₹500–₹2,000',
      pharmacy_range: '₹200–₹800',
      total_range: '₹1,500–₹4,300',
      total_usd: '$18–$52',
      insurance_coverage_pct: '~70%',
      out_of_pocket_estimate: '₹450–₹1,290',
      note: 'Estimated costs. Actual costs may vary by location and provider.'
    }, specialist);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔮 Predict My Costs'; }
  }
}

function renderCostPrediction(data, specialist) {
  const container = document.getElementById('predict-result');
  if (!container) return;

  container.innerHTML = `
    <div class="card card-padded" style="margin-bottom:16px; border-left:4px solid var(--secondary);">
      <h3 style="margin-bottom:16px;">💰 Cost Estimate — ${specialist}</h3>
      <div style="display:grid; gap:10px; margin-bottom:16px;">
        ${[
          { label: 'Consultation', value: data.consultation_range, icon: '🩺' },
          { label: 'Lab Tests', value: data.lab_range, icon: '🔬' },
          { label: 'Pharmacy', value: data.pharmacy_range, icon: '💊' },
        ].map(item => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--neutral-200);">
            <span style="display:flex; align-items:center; gap:8px; font-size:14px;">${item.icon} ${item.label}</span>
            <span style="font-weight:600;">${item.value}</span>
          </div>
        `).join('')}
      </div>

      <div style="background:var(--neutral-50); border-radius:var(--radius-md); padding:16px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-weight:600;">Total Estimate</span>
          <div style="text-align:right;">
            <div style="font-size:20px; font-weight:700; color:var(--secondary);">${data.total_range}</div>
            <div class="caption">${data.total_usd}</div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
          <span class="caption">Insurance Coverage</span>
          <span style="color:var(--success); font-weight:600;">${data.insurance_coverage_pct}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:13px;">
          <span class="caption">Your Out-of-Pocket</span>
          <span style="color:var(--primary); font-weight:600;">${data.out_of_pocket_estimate}</span>
        </div>
      </div>

      <p class="caption" style="text-align:center;">${data.note}</p>
    </div>
  `;
}
