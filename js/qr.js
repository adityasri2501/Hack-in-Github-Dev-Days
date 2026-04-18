// js/qr.js — QR Code Generation
import State from './state.js';
import { translateText } from './api.js';

async function generateMedicalQR(profile, destinationLanguage, canvasElement) {
  const qrData = JSON.stringify({
    name: profile.name || 'Unknown',
    blood_type: profile.bloodGroup || 'Unknown',
    allergies: (profile.allergies || []).map(a => `${a.name} (${a.severity})`),
    critical_medications: (profile.medications || []).map(m => `${m.name} ${m.dosage}`),
    conditions: profile.conditions || [],
    emergency_contact: (profile.emergencyContacts || [])[0] || null,
    generated: new Date().toISOString(),
    app: 'MediRoute',
    dest_lang: destinationLanguage
  });

  try {
    if (window.QRCode) {
      // Clear previous QR
      canvasElement.innerHTML = '';
      new QRCode(canvasElement, {
        text: qrData,
        width: 260,
        height: 260,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      // Fallback: use Google Charts API
      const encoded = encodeURIComponent(qrData);
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encoded}`;
      img.style.borderRadius = '8px';
      canvasElement.innerHTML = '';
      canvasElement.appendChild(img);
    }
    return true;
  } catch (e) {
    console.error('QR generation failed:', e);
    return false;
  }
}

function downloadQR(canvasElement, filename = 'mediroute_qr.png') {
  const canvas = canvasElement.querySelector('canvas');
  if (canvas) {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } else {
    const img = canvasElement.querySelector('img');
    if (img) {
      const a = document.createElement('a');
      a.href = img.src;
      a.download = filename;
      a.target = '_blank';
      a.click();
    }
  }
}

export { generateMedicalQR, downloadQR };
export default { generateMedicalQR, downloadQR };
