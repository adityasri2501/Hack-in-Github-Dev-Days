// js/screens/doctors.js — Doctor Search & Listing Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { getDoctors, matchDoctors, formatPrice } from '../api.js';
import Voice from '../voice.js';
import { showToast } from '../app.js';

let allDoctors = [];
let filteredDoctors = [];
let activeFilters = { specialty: '', language: '', insurance: false, availableNow: false, touristReviewed: false, maxFee: 5000 };
let searchQuery = '';

const SPECIALTIES = ['Cardiology', 'General Medicine', 'Dermatology', 'Orthopedics', 'ENT', 'Neurology', 'Gastroenterology', 'Gynecology', 'Pediatrics', 'Emergency Medicine'];
const LANGUAGES = ['English', 'French', 'Spanish', 'German', 'Arabic', 'Portuguese'];

export function render(params = {}) {
  const specialtyFilter = params.specialty || '';
  if (specialtyFilter) activeFilters.specialty = specialtyFilter;

  return `
    <div class="doctors-screen screen-enter">
      <!-- Search Bar -->
      <div class="doctors-search-bar">
        <div class="form-search">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="doctor-search" placeholder="${t('search_placeholder', 'Search by name, specialty, condition...')}" value="${searchQuery}" aria-label="Search doctors">
          <button class="btn btn-icon btn-ghost" id="voice-search-btn" style="position:absolute; right:4px; top:50%; transform:translateY(-50%);" title="Voice search">🎤</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="doctors-filters">
        <div class="filter-bar" role="group" aria-label="Filter doctors">
          <select class="filter-chip" id="filter-specialty" aria-label="Filter by specialty" style="appearance:none; border:1.5px solid var(--neutral-200); border-radius:20px; padding:7px 14px; font-size:13px; cursor:pointer;">
            <option value="">All Specialties</option>
            ${SPECIALTIES.map(s => `<option value="${s}" ${activeFilters.specialty === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select class="filter-chip" id="filter-language" aria-label="Filter by language" style="appearance:none; border:1.5px solid var(--neutral-200); border-radius:20px; padding:7px 14px; font-size:13px; cursor:pointer;">
            <option value="">Any Language</option>
            ${LANGUAGES.map(l => `<option value="${l}">${l}</option>`).join('')}
          </select>
          <label class="toggle" style="margin:0;" title="Available Now">
            <input type="checkbox" class="toggle-input" id="filter-available" ${activeFilters.availableNow ? 'checked' : ''} aria-label="Available Now filter">
            <div class="toggle-track"><div class="toggle-thumb"></div></div>
            <span style="font-size:13px; white-space:nowrap;">Available Now</span>
          </label>
          <label class="toggle" style="margin:0;" title="Tourist Reviewed">
            <input type="checkbox" class="toggle-input" id="filter-tourist" ${activeFilters.touristReviewed ? 'checked' : ''} aria-label="Tourist Reviewed filter">
            <div class="toggle-track"><div class="toggle-thumb"></div></div>
            <span style="font-size:13px; white-space:nowrap;">Tourist-Reviewed</span>
          </label>
        </div>
      </div>

      <!-- Results -->
      <div class="doctors-list" id="doctors-list">
        <div class="loading-state"><div class="spinner"></div><p data-i18n="loading">Loading...</p></div>
      </div>
    </div>
  `;
}

export async function init(params = {}) {
  if (params.specialty) activeFilters.specialty = params.specialty;

  // Load doctors
  allDoctors = await getDoctors().catch(() => []);
  
  // Localize doctor data (Hospital names and city)
  const userCity = State.get('lastCity') || 'Mumbai';
  allDoctors = allDoctors.map(doc => {
    // If the hospital or address mentions Mumbai/Delhi/Goa, replace with user's city
    return {
      ...doc,
      hospital: (doc.hospital || '').replace(/Mumbai|Delhi|Goa/g, userCity),
      location: (doc.location || '').replace(/Mumbai|Delhi|Goa/g, userCity)
    };
  });
  
  // Try AI matching if triage result exists
  const triageResult = State.get('triageResult');
  if (triageResult) {
    const profile = State.profile.get();
    const matches = await matchDoctors(triageResult, profile).catch(() => null);
    if (matches) renderAIMatches(matches);
  }

  applyFilters();

  // Search input
  document.getElementById('doctor-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    applyFilters();
  });

  // Voice search
  document.getElementById('voice-search-btn')?.addEventListener('click', () => {
    Voice.start({
      lang: State.get('language'),
      onResult: (text) => {
        searchQuery = text.toLowerCase();
        const input = document.getElementById('doctor-search');
        if (input) input.value = text;
        applyFilters();
      }
    });
  });

  // Filters
  document.getElementById('filter-specialty')?.addEventListener('change', (e) => {
    activeFilters.specialty = e.target.value;
    applyFilters();
  });
  document.getElementById('filter-language')?.addEventListener('change', (e) => {
    activeFilters.language = e.target.value;
    applyFilters();
  });
  document.getElementById('filter-available')?.addEventListener('change', (e) => {
    activeFilters.availableNow = e.target.checked;
    applyFilters();
  });
  document.getElementById('filter-tourist')?.addEventListener('change', (e) => {
    activeFilters.touristReviewed = e.target.checked;
    applyFilters();
  });
}

async function renderAIMatches(matches) {
  const list = document.getElementById('doctors-list');
  if (!list || !matches.length) return;

  const currency = State.get('currency') || 'USD';
  const matchCards = await Promise.all(matches.map(async m => {
    const doctor = allDoctors.find(d => d.id === m.doctor_id);
    if (!doctor) return '';
    return `
      <div class="doctor-card" style="border-left:3px solid var(--secondary); background:linear-gradient(135deg,#f0f8ff,white);">
        ${renderDoctorCard(doctor, currency)}
        <div class="match-reason">🤖 ${m.match_reason}</div>
        <div class="match-score-bar"><div class="match-score-fill" style="width:${m.match_score}%"></div></div>
        <span class="caption">AI Match Score: ${m.match_score}/100</span>
      </div>
    `;
  }));

  const aiSection = document.createElement('div');
  aiSection.innerHTML = `
    <div style="margin-bottom:16px;">
      <div class="section-header">
        <h2 class="section-title">🤖 Best Matches for Your Symptoms</h2>
      </div>
      ${matchCards.join('')}
    </div>
    <div class="divider"></div>
    <h3 style="margin-bottom:12px;">All Doctors</h3>
  `;
  list.prepend(aiSection);
}

function applyFilters() {
  filteredDoctors = allDoctors.filter(doc => {
    if (activeFilters.specialty && doc.specialty !== activeFilters.specialty) return false;
    if (activeFilters.language) {
      const hasLang = doc.languages?.some(l => l.lang === activeFilters.language);
      if (!hasLang) return false;
    }
    if (activeFilters.availableNow && !doc.available_now) return false;
    if (activeFilters.touristReviewed && !doc.badges?.includes('tourist_reviewed')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = `${doc.name} ${doc.specialty} ${doc.hospital} ${doc.city}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  renderDoctorList();
}

function renderDoctorList() {
  const list = document.getElementById('doctors-list');
  if (!list) return;

  // Clear only non-AI section content
  const existingAI = list.querySelector('[style*="Best Matches"]')?.closest('div');
  list.innerHTML = '';
  if (existingAI) list.appendChild(existingAI);

  if (!filteredDoctors.length) {
    list.innerHTML += `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">${t('no_doctors_found', 'No doctors found')}</div><div class="empty-desc">Try adjusting your filters</div></div>`;
    return;
  }

  const currency = State.get('currency') || 'USD';
  filteredDoctors.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    card.innerHTML = renderDoctorCard(doc, currency);
    card.querySelector('.view-profile-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.hash = `#/doctors/${doc.id}`;
    });
    card.querySelector('.book-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showBookingModal(doc);
    });
    card.addEventListener('click', () => { window.location.hash = `#/doctors/${doc.id}`; });
    list.appendChild(card);
  });
}

function renderDoctorCard(doc, currency) {
  const badgeHTML = (doc.badges || []).map(b => {
    const badgeMap = {
      nmc_verified: `<span class="badge badge-blue">✓ NMC Verified</span>`,
      tourist_reviewed: `<span class="badge badge-purple">⭐ Tourist-Reviewed</span>`,
      english_speaking: `<span class="badge badge-green">🗣 English</span>`,
      available_247: `<span class="badge badge-teal">24/7</span>`,
      walk_in: `<span class="badge badge-orange">Walk-in</span>`,
      insurance_accepted: `<span class="badge badge-indigo">Insurance</span>`
    };
    return badgeMap[b] || '';
  }).join('');

  const availableColor = doc.available_now ? 'var(--success)' : 'var(--neutral-400)';
  const availableText = doc.available_now ? `🟢 ${doc.next_slot || 'Available Now'}` : `⚪ ${doc.next_slot || 'By Appointment'}`;
  const fee = doc.tourist_consultation_fee_min && doc.tourist_consultation_fee_max
    ? `₹${doc.tourist_consultation_fee_min}–₹${doc.tourist_consultation_fee_max}`
    : 'Fee on request';

  const touristReviews = (doc.reviews || []).filter(r => r.reviewer_nationality !== 'India' && r.reviewer_nationality !== 'IN');

  return `
    <div class="doctor-card-header">
      <img class="doctor-avatar" src="${doc.photo_url || 'https://i.pravatar.cc/150?img=1'}" alt="Dr. ${doc.name}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=1'"/>
      <div class="doctor-info">
        <div class="doctor-name">${doc.name}</div>
        <div class="doctor-specialty">${doc.specialty}</div>
        <div class="doctor-hospital">${doc.hospital || ''}, ${doc.city || ''}</div>
      </div>
      <div class="doctor-rating">
        ⭐ ${doc.tourist_review_score || '4.5'}
        <span class="caption">(${doc.tourist_review_count || 0})</span>
      </div>
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">${badgeHTML}</div>
    <div class="doctor-card-meta">
      <div class="meta-row">
        🗣 ${(doc.languages || []).map(l => `${l.lang} (${l.level})`).join(' · ')}
      </div>
      <div class="meta-row">
        💰 <strong>${t('tourist_fee', 'Tourist Fee')}:</strong> ${fee}
      </div>
      ${doc.insurance_accepted?.length ? `
        <div class="meta-row">
          ✅ ${t('accepts', 'Accepts')}: ${doc.insurance_accepted.slice(0, 3).join(', ')}${doc.insurance_accepted.length > 3 ? '...' : ''}
        </div>
      ` : ''}
      <div class="meta-row" style="color:${availableColor}; font-weight:500;">
        ${availableText}${doc.walk_ins ? ' · Walk-ins OK' : ''}
      </div>
    </div>
    ${touristReviews[0] ? `
      <div class="review-card" style="margin-bottom:12px;">
        <div class="review-header">
          <span class="reviewer-flag">${touristReviews[0].flag || '🌍'}</span>
          <div>
            <div class="reviewer-name">${touristReviews[0].reviewer_name}</div>
            <div class="reviewer-nationality">${touristReviews[0].reviewer_nationality} · ${'⭐'.repeat(touristReviews[0].score)}</div>
          </div>
        </div>
        <p style="font-size:13px; color:var(--text-secondary);">"${touristReviews[0].text}"</p>
      </div>
    ` : ''}
    <div class="doctor-card-actions">
      <button class="btn btn-primary book-btn">${t('book_appointment', 'Book Appointment')}</button>
      <button class="btn btn-outline view-profile-btn">${t('view_profile', 'View Profile')}</button>
    </div>
  `;
}

function showBookingModal(doctor) {
  const modal = document.getElementById('booking-modal');
  const content = document.getElementById('booking-content');
  if (!modal || !content) return;

  const slots = ['9:00 AM', '10:30 AM', '12:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];
  content.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <img src="${doctor.photo_url}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;" alt="${doctor.name}"/>
      <div>
        <div style="font-weight:600">${doctor.name}</div>
        <div style="font-size:13px;color:var(--text-secondary)">${doctor.specialty} · ${doctor.hospital}</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Select Date</label>
      <input type="date" class="form-input" id="book-date" min="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">Select Time</label>
      <div class="time-slots">
        ${slots.map(s => `<div class="time-slot" data-slot="${s}">${s}</div>`).join('')}
      </div>
    </div>
    <button class="btn btn-primary btn-full" id="confirm-booking" style="margin-top:16px;">Confirm Booking</button>
    <button class="btn btn-ghost btn-full" onclick="document.getElementById('booking-modal').classList.remove('open')">Cancel</button>
  `;

  document.querySelectorAll('.time-slot').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
    });
  });

  document.getElementById('confirm-booking')?.addEventListener('click', () => {
    const date = document.getElementById('book-date')?.value;
    const time = document.querySelector('.time-slot.selected')?.dataset.slot;
    if (!date || !time) { showToast('Please select date and time', 'warning'); return; }
    
    // Save visit
    State.profile.addVisit({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      doctorName: doctor.name,
      clinic: doctor.hospital,
      specialty: doctor.specialty,
      status: 'Upcoming',
      appointmentDate: date,
      appointmentTime: time
    });
    
    modal.classList.remove('open');
    showToast(`Appointment booked with ${doctor.name} on ${date} at ${time}`, 'success');
  });

  modal.classList.add('open');
}
