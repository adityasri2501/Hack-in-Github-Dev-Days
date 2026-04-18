// js/screens/doctor-detail.js — Doctor Detail Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { getDoctors } from '../api.js';
import { showToast } from '../app.js';

export function render(params = {}) {
  return `<div class="screen-enter" id="doctor-detail-screen">
    <div class="loading-state"><div class="spinner"></div><p>Loading doctor profile...</p></div>
  </div>`;
}

export async function init(params = {}) {
  const { id } = params;
  if (!id) { window.location.hash = '#/doctors'; return; }

  const container = document.getElementById('doctor-detail-screen');
  if (!container) return;

  try {
    const doctors = await getDoctors();
    const doc = doctors.find(d => d.id === id);
    if (!doc) { container.innerHTML = '<div class="container"><p>Doctor not found.</p></div>'; return; }

    const touristReviews = (doc.reviews || []).filter(r => r.reviewer_nationality !== 'India' && r.reviewer_nationality !== 'IN');

    container.innerHTML = `
      <!-- Hero Header -->
      <div class="doctor-detail-hero">
        <div class="container">
          <button onclick="window.history.back()" class="btn btn-ghost btn-sm" style="color:rgba(255,255,255,0.8); margin-bottom:16px;">← Back</button>
          <div style="display:flex; align-items:flex-start; gap:16px;">
            <img class="doctor-detail-avatar" src="${doc.photo_url}" alt="${doc.name}" onerror="this.src='https://i.pravatar.cc/150?img=1'"/>
            <div>
              <h1 style="color:white; font-size:22px; margin-bottom:4px;">${doc.name}</h1>
              <p style="color:rgba(255,255,255,0.85); font-size:15px; margin-bottom:8px;">${doc.specialty} · ${doc.experience_years || ''}y exp</p>
              <p style="color:rgba(255,255,255,0.7); font-size:13px;">${(doc.degrees || []).join(' · ')}</p>
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:12px;">
            ${(doc.badges || []).map(b => {
              const bm = { nmc_verified: '✓ NMC', tourist_reviewed: '⭐ Tourist', english_speaking: '🗣 English', available_247: '24/7', walk_in: 'Walk-in', insurance_accepted: '🛡 Insurance' };
              return `<span style="background:rgba(255,255,255,0.2); color:white; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500;">${bm[b] || b}</span>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="container" style="margin-top:-20px;">
        <!-- Quick Actions -->
        <div class="card card-padded" style="margin-bottom:16px;">
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" style="flex:1;" id="book-detail-btn">📅 ${t('book_appointment', 'Book Appointment')}</button>
            <a href="tel:${doc.phone || ''}" class="btn btn-outline" style="flex:1;">📞 Call</a>
          </div>
        </div>

        <!-- Availability & Fee -->
        <div class="card card-padded" style="margin-bottom:16px;">
          <h3 style="margin-bottom:12px;">⏰ Availability & Pricing</h3>
          <div class="info-row">
            <span class="info-label">Consultation Hours</span>
            <span class="info-value">${doc.consultation_hours || 'By appointment'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Next Available Slot</span>
            <span class="info-value" style="color:var(--success); font-weight:600;">${doc.next_slot || 'Check availability'}</span>
          </div>
          <div class="divider"></div>
          <div class="price-box">
            <div class="label" style="color:var(--text-secondary); margin-bottom:6px;">🏷 Tourist Consultation Fee (pre-agreed, no surprise charges)</div>
            <div class="price-inr">₹${doc.tourist_consultation_fee_min}–₹${doc.tourist_consultation_fee_max}</div>
            <div class="price-usd" id="price-converted">Loading conversion...</div>
          </div>
          ${doc.walk_ins ? '<div class="notification-banner success" style="margin-top:12px;"><span>✅</span><span>Walk-in patients accepted</span></div>' : ''}
        </div>

        <!-- Language DNA -->
        <div class="card card-padded" style="margin-bottom:16px;">
          <h3 style="margin-bottom:12px;">🗣 Language Profile</h3>
          <div style="margin-bottom:8px;"><span class="label">Languages Spoken</span></div>
          <div class="lang-dna-grid">
            ${(doc.languages || []).map(l => `
              <div class="lang-dna-pill">
                ${l.lang}
                <span class="lang-level">(${l.level})</span>
                ${l.medical_degree_language ? '🎓' : ''}
              </div>
            `).join('')}
          </div>
          ${doc.degrees ? `<p class="caption" style="margin-top:8px;">Medical degree in: ${doc.degrees[0] || ''}</p>` : ''}
        </div>

        <!-- Insurance -->
        <div class="card card-padded" style="margin-bottom:16px;">
          <h3 style="margin-bottom:12px;">🛡 Insurance Accepted</h3>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${(doc.insurance_accepted || []).map(ins => `<span class="badge badge-indigo">${ins}</span>`).join('')}
          </div>
        </div>

        <!-- Map -->
        <div class="card" style="margin-bottom:16px; overflow:hidden;">
          <div style="padding:16px 16px 8px;">
            <h3>📍 Location</h3>
            <p class="caption" style="margin-top:4px;">${doc.address || ''}</p>
          </div>
          <div id="doctor-map" style="height:200px;"></div>
          <div style="padding:12px 16px;">
            <a href="https://maps.google.com/?q=${doc.lat},${doc.lng}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
              Open in Google Maps ↗
            </a>
          </div>
        </div>

        <!-- Facility -->
        <div class="card card-padded" style="margin-bottom:16px;">
          <h3 style="margin-bottom:12px;">🏥 Facilities</h3>
          <div class="facility-grid">
            ${[
              ['lab_on_site', '🔬 Lab On-site'],
              ['pharmacy_attached', '💊 Pharmacy Attached'],
              ['parking', '🅿️ Parking'],
              ['wheelchair_accessible', '♿ Wheelchair Access'],
              ['cashless_insurance', '💳 Cashless Insurance'],
            ].map(([key, label]) => `
              <div class="facility-item ${doc.facility?.[key] ? 'yes' : 'no'}">
                ${doc.facility?.[key] ? '✅' : '❌'} ${label}
              </div>
            `).join('')}
          </div>
          ${doc.facility?.payment_methods?.length ? `
            <div style="margin-top:12px;">
              <span class="label">Payment Methods</span>
              <div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:6px;">
                ${(doc.facility.payment_methods || []).map(m => `<span class="badge badge-green">${m}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Tourist Reviews -->
        <div class="card card-padded" style="margin-bottom:16px;">
          <h3 style="margin-bottom:4px;">⭐ Tourist Reviews (${touristReviews.length})</h3>
          <p class="caption" style="margin-bottom:12px;">Only reviews from international visitors are shown</p>
          ${touristReviews.length ? touristReviews.map(r => `
            <div class="review-card" style="margin-bottom:10px;">
              <div class="review-header">
                <span class="reviewer-flag">${r.flag || '🌍'}</span>
                <div>
                  <div class="reviewer-name">${r.reviewer_name}</div>
                  <div class="reviewer-nationality">${r.reviewer_nationality} · ${'⭐'.repeat(r.score)} · ${r.date}</div>
                </div>
              </div>
              <p style="font-size:14px; color:var(--text-primary);">"${r.text}"</p>
            </div>
          `).join('') : '<p class="caption">No tourist reviews yet. Be the first!</p>'}
        </div>

        <!-- Pre-visit symptom form -->
        <div class="card card-padded" style="margin-bottom:16px;">
          <h3 style="margin-bottom:8px;">📋 Pre-Visit Symptom Form</h3>
          <p class="caption" style="margin-bottom:12px;">Optionally describe your symptoms before booking — these will be shared with the doctor</p>
          <textarea class="form-textarea" id="previsit-symptoms" placeholder="Describe your symptoms here..."></textarea>
          <button class="btn btn-secondary btn-full" id="send-previsit" style="margin-top:8px;">
            Submit Pre-Visit Info
          </button>
        </div>

        <div style="height:16px;"></div>
      </div>
    `;

    // Load map
    setTimeout(() => {
      if (doc.lat && doc.lng && window.L) {
        try {
          const map = L.map('doctor-map').setView([doc.lat, doc.lng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
          L.marker([doc.lat, doc.lng]).addTo(map).bindPopup(`<b>${doc.name}</b><br>${doc.hospital}`).openPopup();
        } catch (e) { console.warn('Map init failed:', e); }
      }
    }, 200);

    // Currency conversion
    const { formatPrice } = await import('../api.js');
    const currency = State.get('currency') || 'USD';
    const converted = await formatPrice(doc.tourist_consultation_fee_min, currency).catch(() => '');
    const priceEl = document.getElementById('price-converted');
    if (priceEl) priceEl.textContent = `(~${converted.split('(')[1]?.replace(')', '') || converted})`;

    // Book button
    document.getElementById('book-detail-btn')?.addEventListener('click', () => {
      window.location.hash = '#/doctors';
      setTimeout(() => {
        showToast('Select a time slot in the booking modal', 'info');
      }, 500);
    });

    // Pre-visit submit
    document.getElementById('send-previsit')?.addEventListener('click', () => {
      const text = document.getElementById('previsit-symptoms')?.value.trim();
      if (!text) { showToast('Please describe your symptoms first', 'warning'); return; }
      showToast('Pre-visit info sent to ' + doc.name, 'success');
    });

  } catch (e) {
    container.innerHTML = `<div class="container"><div class="notification-banner danger"><span>⚠️</span><span>Failed to load doctor profile. Please try again.</span></div></div>`;
  }
}
