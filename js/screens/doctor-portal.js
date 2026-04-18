// js/screens/doctor-portal.js
import State from '../state.js';
import App from '../app.js';

let sseSource = null;

export function render() {
  const isOnline = State.get('doctor_is_online') || false;
  const doctorName = State.get('doctor_name') || '';
  const doctorId = State.get('doctor_id') || '';
  const doctorSpecialty = State.get('doctor_specialty') || 'General';

  if (isOnline) {
    return renderActiveDashboard(doctorName, doctorSpecialty);
  } else {
    return renderSettingsForm(doctorName, doctorId, doctorSpecialty);
  }
}

function renderSettingsForm(name, id, specialty) {
  return `
    <div class="doctor-portal-wrapper fade-in" style="padding-bottom:100px;">
      <div style="background: linear-gradient(135deg, #1f2937, #111827); color:white; padding:40px 20px; border-radius: 0 0 24px 24px; margin: -20px -20px 24px -20px;">
        <h1 style="margin: 0; font-size: 28px; font-weight:800; letter-spacing:-0.5px;">Doctor Portal</h1>
        <p style="margin-top:8px; opacity:0.8;">Enter your credentials to go online.</p>
      </div>
      
      <div class="card card-padded" style="border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 8px 30px rgba(0,0,0,0.04);">
        <form id="doctor-setup-form">
          <div class="form-group mb-16">
            <label class="form-label">Full Name</label>
            <input type="text" id="doc-name" class="input-field" placeholder="Dr. Sarah Johnson" value="${name}" required />
          </div>
          
          <div class="form-group mb-16">
            <label class="form-label">Medical License ID</label>
            <input type="text" id="doc-id" class="input-field" placeholder="MED-98214" value="${id}" required />
          </div>
          
          <div class="form-group mb-16">
            <label class="form-label">Specialty</label>
            <select id="doc-specialty" class="input-field">
              <option value="General" ${specialty === 'General' ? 'selected' : ''}>General Physician</option>
              <option value="Cardiologist" ${specialty === 'Cardiologist' ? 'selected' : ''}>Cardiologist</option>
              <option value="Surgeon" ${specialty === 'Surgeon' ? 'selected' : ''}>Surgeon</option>
              <option value="Pediatrician" ${specialty === 'Pediatrician' ? 'selected' : ''}>Pediatrician</option>
              <option value="Orthopedic" ${specialty === 'Orthopedic' ? 'selected' : ''}>Orthopedic</option>
            </select>
          </div>
          
          <div class="form-group mb-16">
            <label class="form-label">Current Hospital Affiliation (Dummy Data)</label>
            <select id="doc-hospital" class="input-field">
              <option value="Apollo Hospitals (Nearby)">Apollo Hospitals (Nearby)</option>
              <option value="Fortis Healthcare (1.2km)">Fortis Healthcare (1.2km)</option>
              <option value="Max Super Speciality">Max Super Speciality</option>
              <option value="Global Health Center">Global Health Center</option>
            </select>
          </div>
          
          <div class="form-group mb-24">
            <label class="form-label">Available Free Time</label>
            <input type="time" class="input-field" style="display:inline-block; width:45%;" value="09:00" /> to 
            <input type="time" class="input-field" style="display:inline-block; width:45%;" value="18:00" />
          </div>
          
          <button type="submit" class="btn btn-primary btn-full btn-lg" style="background:#10b981; border:none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
             🟢 Go Online & Listen for SOS
          </button>
        </form>
      </div>
    </div>
  `;
}

function renderActiveDashboard(name, specialty) {
  return `
    <div class="doctor-dashboard fade-in" style="padding-bottom:100px; min-height: 100vh; background-color: #f3f4f6; margin: -20px; padding: 20px;">
      
      <!-- Top Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; background: #fff; padding: 16px 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 24px;">
        <div style="display:flex; align-items:center; gap: 12px;">
          <div class="status-indicator">
            <span class="pulsing-dot" style="background-color: #10b981;"></span>
          </div>
          <div>
            <h3 style="margin:0; font-size:16px;">${name || 'Doctor'}</h3>
            <span style="font-size:13px; color:var(--text-secondary);">${specialty} · Online</span>
          </div>
        </div>
        <button id="go-offline-btn" class="btn btn-outline" style="padding: 6px 12px; font-size:13px; border-color: #ef4444; color: #ef4444;">Go Offline</button>
      </div>

      <!-- Stats -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background:#fff; padding:16px; border-radius:16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
          <div style="font-size:24px; font-weight:bold; color:#3b82f6;">0</div>
          <div style="font-size:13px; color:var(--text-secondary);">Active Cases</div>
        </div>
        <div style="background:#fff; padding:16px; border-radius:16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
          <div style="font-size:24px; font-weight:bold; color:#10b981;">Connected</div>
          <div style="font-size:13px; color:var(--text-secondary);">SSE Status</div>
        </div>
      </div>

      <h2 style="font-size:18px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
        🚨 Live Emergency Feed
      </h2>

      <!-- Feed Container -->
      <div id="sos-feed-container" style="display:flex; flex-direction:column; gap: 16px;">
        <div style="text-align:center; padding: 40px 20px; color: #9ca3af;" id="empty-feed-state">
          <div style="font-size: 40px; margin-bottom: 12px; opacity:0.5;">📡</div>
          Listening for emergency broadcast signals...
        </div>
      </div>

    </div>
  `;
}

export function init() {
  const isOnline = State.get('doctor_is_online') || false;

  if (isOnline) {
    initDashboard();
  } else {
    initForm();
  }
}

function initForm() {
  const form = document.getElementById('doctor-setup-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    State.set('doctor_name', document.getElementById('doc-name').value);
    State.set('doctor_id', document.getElementById('doc-id').value);
    State.set('doctor_specialty', document.getElementById('doc-specialty').value);
    State.set('doctor_is_online', true);
    
    // Re-render
    App.navigate('/doctor-portal');
  });
}

function initDashboard() {
  const offlineBtn = document.getElementById('go-offline-btn');
  if (offlineBtn) {
    offlineBtn.addEventListener('click', () => {
      if (sseSource) {
        sseSource.close();
        sseSource = null;
      }
      State.set('doctor_is_online', false);
      App.navigate('/doctor-portal');
    });
  }

  // Connect to SSE
  connectSSE();
}

function connectSSE() {
  if (sseSource) sseSource.close();
  
  sseSource = new EventSource('/api/doctor-dashboard/stream');
  
  sseSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'emergency') {
        renderIncomingSOS(payload.data);
      }
      console.log('SSE Data:', payload);
    } catch (e) {
      console.error('SSE Error parsing:', e);
    }
  };

  sseSource.onerror = (err) => {
    console.error('SSE connection error:', err);
  };
}

function renderIncomingSOS(data) {
  const container = document.getElementById('sos-feed-container');
  const emptyState = document.getElementById('empty-feed-state');
  
  if (emptyState) emptyState.style.display = 'none';
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'sos-card slide-down';
  card.style.cssText = 'background: white; border-radius: 16px; padding: 20px; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; margin-bottom:16px; position:relative; overflow:hidden;';
  
  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const mapsLink = data.mapsUrl || "https://maps.google.com/?q=" + (data.gps_lat || 0) + "," + (data.gps_lng || 0);
  
  card.innerHTML = `
    <div style="position:absolute; top:0; right:0; padding:8px 12px; background:#fef2f2; color:#ef4444; border-bottom-left-radius: 12px; font-weight:bold; font-size:12px;">
      !! SOS ALERT !!
    </div>
    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 12px;">
      <div>
        <h3 style="margin:0; font-size:18px; color: #111827;">${data.patient_name || 'Anonymous Tourist'}</h3>
        <span style="font-size:13px; color:var(--text-secondary);">${time} · Emergency Triggered</span>
      </div>
    </div>
    
    <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
      <div style="margin-bottom:8px;"><strong>Location Match:</strong> ${data.nearest_hospital || 'Apollo Hospital Area'}</div>
      ${data.gps_lat ? `<div><strong>Coordinates:</strong> ${data.gps_lat.toFixed(4)}, ${data.gps_lng.toFixed(4)}</div>` : ''}
    </div>
    
    <div style="display:flex; gap: 12px;">
      <a href="${mapsLink}" target="_blank" class="btn btn-primary" style="flex: 1; text-align:center; padding: 10px; background:#ef4444; border-color:#ef4444;">
        View on Map
      </a>
      <button class="btn btn-outline" style="flex: 1;" onclick="alert('Accepting patient... Notifying MediRoute dispatcher.'); this.disabled=true; this.textContent='Accepted';">
        Accept Case
      </button>
    </div>
  `;
  
  container.prepend(card);
  
  // Vibrate if on mobile
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 500]);
  }
}
