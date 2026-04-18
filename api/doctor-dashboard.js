// api/doctor-dashboard.js — SSE for Doctor Dashboard
const express = require('express');
const router = express.Router();

// Store connected doctor clients
let clients = [];

// SSE Endpoint
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Flush headers
  res.flushHeaders?.();
  
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);
  
  console.log(`👨‍⚕️ Doctor connected to dashboard (ID: ${clientId})`);
  
  // Send initial connection success
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Listening for emergencies...' })}\n\n`);
  
  req.on('close', () => {
    console.log(`👨‍⚕️ Doctor disconnected (ID: ${clientId})`);
    clients = clients.filter(c => c.id !== clientId);
  });
});

// Broadcast function (to be called by other routes)
function broadcastEmergency(data) {
  console.log(`📡 Broadcasting emergency to ${clients.length} doctors...`);
  const payload = JSON.stringify({ type: 'emergency', data });
  clients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      console.error('Error sending to client:', e);
    }
  });
}

// Optional generic API to trigger
router.post('/broadcast', (req, res) => {
  broadcastEmergency(req.body);
  res.json({ success: true, clientsNotified: clients.length });
});

module.exports = { router, broadcastEmergency };
