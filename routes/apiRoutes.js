const express = require('express');
const router = express.Router();
const { getConfig, setConfig } = require('../config/db');

// Ambil pengaturan
router.get('/settings', (req, res) => {
  try {
    const config = getConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simpan pengaturan
router.post('/settings', (req, res) => {
  try {
    const { webhookUrl, groqApiKey, autoReply, prefix } = req.body;
    const updated = setConfig({
      webhookUrl: webhookUrl || '',
      groqApiKey: groqApiKey || '',
      autoReply: autoReply !== undefined ? autoReply : true,
      prefix: prefix || ''
    });
    res.json({ success: true, data: updated, message: 'Pengaturan berhasil disimpan!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status koneksi WhatsApp (akan diupdate di Langkah 4)
router.get('/status', (req, res) => {
  const whatsappService = require('../services/whatsappService');
  res.json({
    success: true,
    data: {
      status: whatsappService.getStatus(),
      uptime: process.uptime()
    }
  });
});

// Logout WhatsApp
router.post('/logout', async (req, res) => {
  try {
    const whatsappService = require('../services/whatsappService');
    await whatsappService.logout();
    res.json({ success: true, message: 'Berhasil logout dari WhatsApp' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
