// js/screens/home.js — Home / SOS Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { notifyContacts } from '../api.js';
import { showToast, navigate } from '../app.js';

export function render() {
  return `
    <div class="home-screen screen-enter">
      <div class="home-hero">
        <div class="home-logo">
          <div class="home-logo-icon">✚</div>
          <span class="home-logo-text" data-i18n="app_name">MediRoute</span>
        </div>
        <p class="home-tagline" data-i18n="tagline">Emergency Healthcare for Travelers</p>

        <!-- Giant SOS Button -->
        <div class="sos-giant">
          <div class="sos-ring"></div>
          <div class="sos-ring-2"></div>
          <button class="sos-btn-giant" id="home-sos-btn" aria-label="Emergency SOS - tap for emergency help">
            SOS
          </button>
        </div>
        <p class="sos-tap-label" data-i18n="sos_tap">TAP FOR EMERGENCY HELP</p>

        <!-- QR Card Mini Preview -->
        <div id="qr-mini-preview" style="display:none; margin-bottom:16px; cursor:pointer;" onclick="window.location.hash='#/profile'">
          <div style="background:white; border-radius:12px; padding:12px 16px; border:1.5px solid var(--neutral-200); box-shadow:var(--shadow-sm); display:flex; align-items:center; gap:12px; max-width:320px;">
            <div style="width:48px;height:48px;background:var(--neutral-100);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">🏥</div>
            <div>
              <div style="font-weight:600;font-size:13px;">Medical QR Ready</div>
              <div style="font-size:12px;color:var(--text-secondary)" id="qr-mini-info"></div>
            </div>
            <div style="margin-left:auto; font-size:20px; color:var(--neutral-400)">›</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="home-quick-grid">
        <div class="quick-grid">
          <a href="#/triage?mode=voice" class="quick-action" id="qa-voice">
            <div class="quick-action-icon">🎤</div>
            <div class="quick-action-label" data-i18n="voice_symptom_check">Voice Symptom Check</div>
          </a>
          <a href="#/doctors" class="quick-action" id="qa-doctors">
            <div class="quick-action-icon">🔍</div>
            <div class="quick-action-label" data-i18n="find_doctor">Find a Doctor</div>
          </a>
          <a href="#/profile#medications" class="quick-action" id="qa-meds">
            <div class="quick-action-icon">💊</div>
            <div class="quick-action-label" data-i18n="my_medications">My Medications</div>
          </a>
          <a href="#/pharmacy" class="quick-action" id="qa-pharmacy">
            <div class="quick-action-icon">🏥</div>
            <div class="quick-action-label" data-i18n="nearest_pharmacy">Nearest Pharmacy</div>
          </a>
        </div>

        <!-- Additional shortcuts -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
          <a href="#/triage" class="quick-action" id="qa-triage">
            <div class="quick-action-icon">🩺</div>
            <div class="quick-action-label" data-i18n="triage">Symptom Check</div>
          </a>
          <a href="#/prescription" class="quick-action" id="qa-prescription">
            <div class="quick-action-icon">📋</div>
            <div class="quick-action-label" data-i18n="prescription">Prescription</div>
          </a>
        </div>
      </div>

      <!-- Bottom padding for nav -->
      <div style="height:16px"></div>
    </div>
  `;
}

export function init() {
  // Show QR mini preview if profile has data
  const profile = State.profile.get();
  if (profile.bloodGroup || profile.allergies?.length > 0) {
    const preview = document.getElementById('qr-mini-preview');
    const info = document.getElementById('qr-mini-info');
    if (preview && info) {
      preview.style.display = 'block';
      const parts = [];
      if (profile.bloodGroup) parts.push(`Blood: ${profile.bloodGroup}`);
      if (profile.allergies?.length) parts.push(`${profile.allergies.length} allergy/allergies`);
      info.textContent = parts.join(' · ');
    }
  }

  // Home SOS button
  const sosBtnHome = document.getElementById('home-sos-btn');
  if (sosBtnHome) {
    sosBtnHome.addEventListener('click', triggerSOS);
  }

  // Also bind the FAB
  const sosFab = document.getElementById('sos-fab');
  if (sosFab) {
    sosFab._handler = triggerSOS;
  }
}

async function triggerSOS() {
  const modal = document.getElementById('emergency-modal');
  const msg = document.getElementById('emergency-msg');
  if (modal) modal.classList.add('open');
  if (msg) msg.textContent = t('finding_care', 'Finding nearest emergency care...');

  const profile = State.profile.get();
  
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
    );
    const { latitude, longitude } = pos.coords;
    State.set('lastLocation', { lat: latitude, lng: longitude });

    // Show mini map in modal
    const mapContainer = document.getElementById('emergency-map-container');
    if (mapContainer) {
      mapContainer.style.display = 'block';
      setTimeout(() => {
        const map = L.map('leaflet-map').setView([latitude, longitude], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        const redIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          iconSize: [25, 41], iconAnchor: [12, 41]
        });
        L.marker([latitude, longitude], { icon: redIcon }).addTo(map).bindPopup('You are here').openPopup();
      }, 100);
    }

    if (msg) msg.textContent = `📍 Location found. Notifying emergency contacts...`;

    // Notify contacts
    const contacts = profile.emergencyContacts || [];
    if (contacts.length > 0) {
      await notifyContacts(profile.name || 'MediRoute User', latitude, longitude, 'Nearest Hospital', contacts);
      showToast('Emergency contacts notified', 'success');
    }

    // Navigate to triage in emergency mode
    setTimeout(() => {
      window.location.hash = '#/triage?emergency=true';
    }, 1500);

  } catch (err) {
    if (msg) msg.textContent = 'Location unavailable. Please call 112 directly.';
    console.warn('Geolocation error:', err);
  }
}
