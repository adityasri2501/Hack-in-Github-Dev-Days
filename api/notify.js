// api/notify.js — POST /api/notify-contacts
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { patient_name, gps_lat, gps_lng, nearest_hospital, hospital_address, contacts = [] } = req.body;

  const mapsUrl = `https://maps.google.com/?q=${gps_lat},${gps_lng}`;
  const message = `🚨 EMERGENCY ALERT — MediRoute
${patient_name || 'A MediRoute user'} has activated an SOS alert.
📍 Location: ${mapsUrl}
🏥 Nearest Hospital: ${nearest_hospital || 'Unknown'}
📌 Address: ${hospital_address || 'See map link'}
⏱ Please check in immediately.
Sent via MediRoute Emergency System.`;

  // Log to console (Twilio-ready structure)
  console.log('\n🚨 EMERGENCY NOTIFICATION:');
  console.log('='.repeat(60));
  console.log(message);
  console.log('='.repeat(60));

  const results = contacts.map(contact => {
    console.log(`📱 SMS sent to: ${contact.phone || 'Unknown'}`);
    if (contact.whatsapp) {
      console.log(`💬 WhatsApp sent to: ${contact.whatsapp}`);
    }
    console.log(`Message: ${message}`);

    // Twilio integration ready:
    // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: contact.phone });

    return { contact: contact.name || 'Unknown', status: 'sent (demo)', phone: contact.phone };
  });

  // Broadcast to online doctors via SSE
  const broadcast = req.app.get('doctorDashboardBroadcast');
  if (broadcast) {
    broadcast({ 
      patient_name, 
      gps_lat, 
      gps_lng, 
      nearest_hospital, 
      hospital_address,
      mapsUrl
    });
  }

  res.json({
    success: true,
    message: 'Emergency contacts notified (demo mode) and broadcasted to doctors',
    notifications: results,
    message_sent: message
  });
});

module.exports = router;
