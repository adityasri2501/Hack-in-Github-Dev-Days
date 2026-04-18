// js/screens/pharmacy.js — Pharmacy Finder Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { findGenericDrug } from '../api.js';
import { showToast } from '../app.js';

const MOCK_PHARMACIES = [
  { id: 'ph_01', name: 'Apollo Pharmacy', address: 'Bandra West, Mumbai', distance: '0.3 km', open24h: true, phone: '+91-22-6767-0000', lat: 19.0639, lng: 72.8363, tags: ['English-speaking', 'International card', 'Home delivery'], city: 'Mumbai' },
  { id: 'ph_02', name: 'MedPlus Pharmacy', address: 'Andheri East, Mumbai', distance: '0.8 km', open24h: false, phone: '+91-22-2682-5000', lat: 19.1136, lng: 72.8697, tags: ['International card', 'Prescription required'], city: 'Mumbai' },
  { id: 'ph_03', name: 'Wellness Forever', address: 'Juhu, Mumbai', distance: '1.2 km', open24h: true, phone: '+91-22-2610-3000', lat: 19.1052, lng: 72.8268, tags: ['English-speaking', 'Home delivery', 'International card'], city: 'Mumbai' },
  { id: 'ph_04', name: 'Netmeds Pharmacy', address: 'Linking Road, Mumbai', distance: '1.5 km', open24h: false, phone: '+91-22-4911-2000', lat: 19.0726, lng: 72.8348, tags: ['International card', 'Generic available'], city: 'Mumbai' },
  { id: 'ph_05', name: "Frank Ross Pharmacy", address: 'Connaught Place, Delhi', distance: '0.5 km', open24h: true, phone: '+91-11-2341-5678', lat: 28.6315, lng: 77.2167, tags: ['English-speaking', 'International card', 'Prescription required'], city: 'Delhi' },
  { id: 'ph_06', name: 'Medanta Pharmacy', address: 'Sector 38, Gurugram', distance: '0.2 km', open24h: true, phone: '+91-124-4141-500', lat: 28.4501, lng: 77.0261, tags: ['English-speaking', 'International card', 'Hospital attached'], city: 'Delhi' },
  { id: 'ph_07', name: 'Curebay Pharmacy', address: 'Calangute, Goa', distance: '0.4 km', open24h: false, phone: '+91-832-2276-000', lat: 15.5439, lng: 73.7544, tags: ['English-speaking', 'Tourist friendly'], city: 'Goa' },
  { id: 'ph_08', name: "Guardian Pharmacy", address: 'Panaji, Goa', distance: '1.0 km', open24h: true, phone: '+91-832-2224-000', lat: 15.4985, lng: 73.8278, tags: ['International card', 'English-speaking', 'Home delivery'], city: 'Goa' }
];

let userLocation = null;
let pharmacyMap = null;

export function render() {
  return `
    <div class="pharmacy-screen screen-enter">
      <!-- Heading -->
      <div style="padding:16px 16px 0; background:white; border-bottom:1px solid var(--neutral-200);">
        <h1 style="margin-bottom:4px;" data-i18n="nearest_pharmacy">Nearest Pharmacy</h1>
        <p class="caption">Find pharmacies near you · Generic drug finder</p>
      </div>

      <!-- Map/List toggle -->
      <div style="display:flex; background:white; border-bottom:1px solid var(--neutral-200);">
        <button class="tab-btn active" id="tab-map-view" style="flex:1; border-radius:0; padding:12px;">🗺 Map</button>
        <button class="tab-btn" id="tab-list-view" style="flex:1; border-radius:0; padding:12px;">📋 List</button>
      </div>

      <div id="ph-map-view">
        <div class="pharmacy-map-section" style="position:relative;">
          <div id="pharmacy-map" style="height:350px;"></div>
          <button id="recenter-map-btn" style="position:absolute; bottom:20px; right:20px; z-index:1000; background:white; border:none; border-radius:50%; width:44px; height:44px; box-shadow:0 4px 12px rgba(0,0,0,0.15); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:20px;" title="Recenter Map">
            🎯
          </button>
        </div>
      </div>

      <!-- List -->
      <div id="ph-list-view" style="display:none;">
        <div class="pharmacy-list-section" id="pharmacy-list"></div>
      </div>

      <!-- Generic Drug Finder Panel -->
      <div class="container" style="padding-top:16px; padding-bottom:16px;">
        <div class="card card-padded">
          <h3 style="margin-bottom:4px;">💊 Generic Drug Finder</h3>
          <p class="caption" style="margin-bottom:12px;">Find cheaper generic equivalents for your prescription drugs</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <input type="text" class="form-input" id="generic-drug-input" placeholder="${t('drug_name_input', 'Enter drug name')}" style="flex:2; min-width:160px;">
            <input type="text" class="form-input" id="generic-dosage-input" placeholder="Dosage (e.g. 500mg)" style="flex:1; min-width:100px;">
            <button class="btn btn-primary" id="find-generic-btn" style="white-space:nowrap;" data-i18n="find_generic">Find Generic</button>
          </div>
          <div id="generic-result" style="display:none; margin-top:16px;"></div>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  // Map/List tabs
  document.getElementById('tab-map-view')?.addEventListener('click', () => {
    document.getElementById('ph-map-view').style.display = '';
    document.getElementById('ph-list-view').style.display = 'none';
    document.getElementById('tab-map-view').classList.add('active');
    document.getElementById('tab-list-view').classList.remove('active');
  });
  document.getElementById('tab-list-view')?.addEventListener('click', () => {
    document.getElementById('ph-map-view').style.display = 'none';
    document.getElementById('ph-list-view').style.display = '';
    document.getElementById('tab-map-view').classList.remove('active');
    document.getElementById('tab-list-view').classList.add('active');
    renderPharmacyList();
  });

  // Initialize map
  initPharmacyMap();

  // Recenter button
  document.getElementById('recenter-map-btn')?.addEventListener('click', () => {
    initPharmacyMap();
  });

  // Generic drug finder
  document.getElementById('find-generic-btn')?.addEventListener('click', findGeneric);
}

function initPharmacyMap() {
  setTimeout(async () => {
    if (!window.L) return;
    
    // Default to Mumbai if geolocation fails
    let lat = 19.0760, lng = 72.8777;
    let locationFound = false;
    
    try {
      // First attempt: Browser GPS
      console.log('Attempting GPS geolocation...');
      const pos = await new Promise((resolve, reject) => 
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 8000, 
          enableHighAccuracy: true 
        })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      locationFound = true;

      // Try reverse geocode to get city name
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const geoData = await geoRes.json();
        const city = geoData.address.city || geoData.address.town || geoData.address.suburb || 'Local Area';
        State.set('lastCity', city);
      } catch(e) { console.warn('Reverse geocode failed'); }

    } catch (e) {
      console.warn('GPS failed, attempting IP-based geolocation...', e);
      try {
        // Second attempt: IP-based geolocation
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude) {
          lat = data.latitude;
          lng = data.longitude;
          locationFound = true;
          State.set('lastCity', data.city || 'Local Area');
        }
      } catch (ipErr) {
        const lastLoc = State.get('lastLocation');
        if (lastLoc) {
          lat = lastLoc.lat;
          lng = lastLoc.lng;
          locationFound = true;
        }
      }
    }

    try {
      const mapEl = document.getElementById('pharmacy-map');
      if (!mapEl || !mapEl.offsetParent) return;

      // If we already have a map, remove it to re-init
      if (pharmacyMap) {
        pharmacyMap.remove();
        pharmacyMap = null;
      }

      pharmacyMap = L.map('pharmacy-map').setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19
      }).addTo(pharmacyMap);

      const city = State.get('lastCity') || 'Local Area';

      // User marker
      L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div style="background:#1A73E8; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20]
        })
      }).addTo(pharmacyMap).bindPopup(`<b>📍 You are in ${city}</b>`);

      // Pharmacy markers
      const greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
      });

      // Adjust mock pharmacies to be near user and localize address
      const displayedPharmacies = MOCK_PHARMACIES.map((ph, i) => {
        const offsetLat = (Math.random() - 0.5) * 0.015;
        const offsetLng = (Math.random() - 0.5) * 0.015;
        
        // Localize address: replace "Mumbai", "Delhi", "Goa" with actual city
        const localAddress = ph.address.replace(/Mumbai|Delhi|Goa/g, city);

        return {
          ...ph,
          lat: lat + offsetLat,
          lng: lng + offsetLng,
          address: localAddress,
          distance: (0.3 + i * 0.4).toFixed(1) + ' km'
        };
      });

      displayedPharmacies.forEach(ph => {
        const marker = L.marker([ph.lat, ph.lng], { icon: greenIcon });
        marker.addTo(pharmacyMap).bindPopup(`
          <div style="min-width:150px;">
            <b style="font-size:14px;">${ph.open24h ? '⭐ ' : ''}${ph.name}</b><br>
            <span class="caption">${ph.address}</span><br>
            <div style="margin:5px 0;">
              ${ph.open24h ? '<span style="color:#10b981; font-weight:bold;">🟢 Open 24/7</span>' : '<span style="color:#6b7280;">⚪ Open now</span>'}
            </div>
            <div style="display:flex; gap:10px; margin-top:8px;">
              <a href="tel:${ph.phone}" class="btn btn-sm btn-outline" style="flex:1; padding:4px;">📞 Call</a>
              <a href="https://maps.google.com/?q=${ph.lat},${ph.lng}" target="_blank" class="btn btn-sm btn-secondary" style="flex:1; padding:4px;">📍 Go</a>
            </div>
          </div>
        `);
      });
      
      renderPharmacyList(displayedPharmacies);
      
    } catch (e) {
      console.warn('Map initialization error:', e);
    }
  }, 200);
}

function renderPharmacyList(pharmacies = MOCK_PHARMACIES) {
  const list = document.getElementById('pharmacy-list');
  if (!list) return;

  list.innerHTML = pharmacies.map(ph => `
    <div class="pharmacy-card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
        <div>
          <div class="pharmacy-name">${ph.open24h ? '⭐ ' : ''}${ph.name}</div>
          <div class="caption">${ph.address}</div>
        </div>
        <div class="pharmacy-distance" style="font-size:13px; color:var(--success); font-weight:600; text-align:right;">
          ${ph.open24h ? '🟢 24/7' : '⚪ Hours vary'}<br>
          <span style="color:var(--secondary);">${ph.distance}</span>
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
        ${ph.tags.map(tag => `<span class="badge badge-green">${tag}</span>`).join('')}
      </div>
      <div style="display:flex; gap:8px;">
        <a href="tel:${ph.phone}" class="btn btn-outline btn-sm" style="flex:1;">📞 Call</a>
        <a href="https://maps.google.com/?q=${ph.lat},${ph.lng}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="flex:1;">📍 Directions</a>
      </div>
    </div>
  `).join('');
}

async function findGeneric() {
  const drugInput = document.getElementById('generic-drug-input');
  const dosageInput = document.getElementById('generic-dosage-input');
  const drugName = drugInput?.value.trim();
  const dosage = dosageInput?.value.trim();

  console.log('findGeneric triggered:', { drugName, dosage });
  
  if (!drugName) { 
    showToast('Enter a drug name', 'warning'); 
    return; 
  }

  const btn = document.getElementById('find-generic-btn');
  const resultDiv = document.getElementById('generic-result');
  if (btn) { btn.textContent = 'Searching...'; btn.disabled = true; }

  try {
    const profile = State.profile.get() || {};
    const lang = State.get('language') || 'en';
    
    console.log('Calling findGenericDrug...');
    const result = await findGenericDrug(drugName, dosage, profile.homeCountry, lang);
    console.log('Search result received:', result);
    
    if (!result) throw new Error('No result returned');

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
      <div class="card card-padded" style="background:var(--neutral-50); border:1px solid var(--neutral-200); animation: slide-in-up 0.3s ease-out;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
          <div>
            <span class="badge badge-blue" style="margin-bottom:8px; display:inline-block;">Generic Composition</span>
            <h3 style="font-size:20px;">${result.generic_name || 'Generic ' + drugName}</h3>
          </div>
          <div style="text-align:right;">
            <span class="badge badge-green">💰 ${result.saving_percent || 0}% savings</span>
          </div>
        </div>

        <div style="background: white; border-radius: 12px; padding: 16px; border: 1px dashed var(--secondary); margin-bottom:16px;">
          <div class="caption" style="margin-bottom:4px; color:var(--secondary); font-weight:600;">INDIAN BRAND ALTERNATIVE</div>
          <div style="font-size:18px; font-weight:bold; color:var(--primary);">${result.indian_brand || 'Show composition to pharmacist'}</div>
        </div>
        
        <div class="info-row">
          <span class="info-label">Your Medicine</span>
          <span class="info-value">${result.home_brand || drugName} ${dosage || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Estimated Price (India)</span>
          <span class="info-value" style="color:var(--success); font-weight:600;">₹${result.generic_price_inr || 0}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Int'l Branded Price</span>
          <span class="info-value" style="text-decoration:line-through; opacity:0.6;">₹${result.branded_price_inr || 0}</span>
        </div>

        ${result.notes ? `
          <div style="margin-top:16px; padding:12px; background:#e0f2fe; border-radius:8px; color:#0369a1; font-size:13px; display:flex; gap:8px;">
            <span>ℹ️</span>
            <span>${result.notes}</span>
          </div>
        ` : ''}

        <div style="margin-top:16px; padding:12px; border:1px solid #fed7aa; background:#fff7ed; border-radius:8px; color:#9a3412; font-size:12px;">
          <strong>Pharmacist Tip:</strong> Show the "Generic Composition" above to any Indian pharmacist. They will provide the correct local equivalent.
        </div>
      </div>
    `;
    
    // Smooth scroll to result
    setTimeout(() => resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);

  } catch (e) {
    console.error('findGeneric error:', e);
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="notification-banner warning"><span>⚠️</span><span>Unable to find generic info. Please ask a pharmacist directly by showing your medicine package.</span></div>`;
  }

  if (btn) { 
    btn.textContent = t ? t('find_generic', 'Find Generic') : 'Find Generic'; 
    btn.disabled = false; 
  }
}
