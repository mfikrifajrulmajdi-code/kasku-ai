const express = require('express');
const router = express.Router();
const { getConfig, setConfig } = require('../config/db');
const { requireAuth } = require('../middleware/adminAuth');

// Ambil pengaturan
router.get('/settings', (req, res) => {
  try {
    const config = getConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Multi-Tenant SaaS
router.get('/tenants', requireAuth, (req, res) => {
  try {
    const tenantManager = require('../services/tenantManager');
    const tenants = tenantManager.getAllTenants();
    res.json({ success: true, data: tenants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tenants', requireAuth, (req, res) => {
  try {
    const tenantManager = require('../services/tenantManager');
    const { tenantId, companyName, industry, salesName, opsName } = req.body;
    if (!tenantId || !companyName) {
      return res.status(400).json({ success: false, error: 'Tenant ID & Company Name wajib diisi' });
    }
    const tenant = tenantManager.createTenant(tenantId, { companyName, industry, salesName, opsName });
    res.json({ success: true, data: tenant, message: 'Tenant baru berhasil dibuat!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get('/tenants/:tenantId/usage', requireAuth, (req, res) => {
    const usageMeter = require('../services/usageMeter');
    const usage = usageMeter.getUsage(req.params.tenantId);
    res.json(usage);
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

// Broadcast WhatsApp Massal
router.post('/broadcast', async (req, res) => {
  try {
    const { numbers, message } = req.body;
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ success: false, error: 'Daftar nomor tidak valid' });
    }
    if (!message) {
      return res.status(400).json({ success: false, error: 'Pesan kosong' });
    }
    const whatsappService = require('../services/whatsappService');
    const result = await whatsappService.broadcastMessage(numbers, message);
    res.json({ success: true, data: result, message: 'Broadcast selesai diproses' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ Sandbox API (Simulasi tanpa WA) ============
const { processMessage } = require('../services/aiEngine');
const routerAgent = require('../services/agents/routerAgent');
const registry = require('../services/agents/registry');
const learningSystem = require('../services/learningSystem');

// In-memory sandbox sessions
const sandboxMemory = {};

router.post('/sandbox', async (req, res) => {
  try {
    const { message, persona, sessionId } = req.body;
    // persona: "customer", "vendor", "owner"
    if (!message) return res.status(400).json({ success: false, error: 'Pesan kosong' });

    const sid = sessionId || 'sandbox-default';

    // Simulasikan sender berdasarkan persona
    const fs = require('fs');
    const path = require('path');
    const aiConf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'ai-config.json'), 'utf8'));

    let fakeSender;
    if (persona === 'owner') {
      fakeSender = (aiConf.ownerPhone || '6285196749541') + '@s.whatsapp.net';
    } else if (persona === 'vendor') {
      fakeSender = '628985335666@s.whatsapp.net';
    } else {
      fakeSender = '628123456789@s.whatsapp.net'; // Pelanggan dummy
    }

    // Kelola memori sandbox
    if (!sandboxMemory[sid]) sandboxMemory[sid] = [];
    sandboxMemory[sid].push({ role: 'user', content: message });
    if (sandboxMemory[sid].length > 15) sandboxMemory[sid] = sandboxMemory[sid].slice(-15);

    // Panggil AI Engine langsung (bypass WhatsApp)
    const startTime = Date.now();
    const rawResponse = await processMessage('Sandbox', fakeSender, message, sandboxMemory[sid], null);
    const elapsed = Date.now() - startTime;

    // Parse response
    let responseText = rawResponse;
    let specialAction = null;
    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed.type) {
        specialAction = parsed;
        responseText = parsed.reply || parsed.replyToSender || rawResponse;
      }
    } catch (e) {}

    // Simpan balasan ke memori sandbox
    sandboxMemory[sid].push({ role: 'assistant', content: responseText });
    if (sandboxMemory[sid].length > 15) sandboxMemory[sid] = sandboxMemory[sid].slice(-15);

    res.json({
      success: true,
      data: {
        response: responseText,
        specialAction,
        metadata: {
          persona,
          fakeSender,
          elapsed: elapsed + 'ms',
          memoryLength: sandboxMemory[sid].length
        }
      }
    });
  } catch (err) {
    console.error('[SANDBOX ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset sandbox session
router.post('/sandbox/reset', (req, res) => {
  const { sessionId } = req.body;
  const sid = sessionId || 'sandbox-default';
  sandboxMemory[sid] = [];
  res.json({ success: true, message: `Sesi "${sid}" di-reset.` });
});

// Ambil daftar agen terdaftar
router.get('/sandbox/agents', (req, res) => {
  const agents = registry.getAll().map(a => ({
    id: a.id, name: a.name, description: a.description,
    complexity: a.complexity, requiredRole: a.requiredRole
  }));
  res.json({ success: true, data: agents });
});

// Ambil lessons dan stats
router.get('/sandbox/stats', (req, res) => {
  const agents = registry.getAll();
  const stats = agents.map(a => ({
    id: a.id,
    name: a.name,
    lessons: learningSystem.getLessons(a.id).length,
    examples: learningSystem.getExamples(a.id).length
  }));
  const routerLessons = learningSystem.getLessons('ROUTER').length;
  res.json({ success: true, data: { agents: stats, routerLessons } });
});

// ============ Evaluator API ============
const evaluator = require('../services/evaluator/evaluatorAgent');

let isEvalRunning = false;
let currentEvalProgress = { current: 0, total: 0, scenarioId: '' };

// Run evaluation
router.post('/evaluator/run', async (req, res) => {
  if (isEvalRunning) {
    return res.status(400).json({ success: false, error: 'Evaluasi sedang berjalan. Mohon tunggu...' });
  }

  const { categories, mode } = req.body; // mode: 'hybrid', 'autopilot', 'supervised'
  isEvalRunning = true;
  currentEvalProgress = { current: 0, total: 0, scenarioId: 'Memulai...' };

  try {
    const report = await evaluator.runEvaluation({
      categories: categories || null,
      trainingMode: mode || 'hybrid',
      onProgress: (current, total, scenarioId) => {
        currentEvalProgress = { current, total, scenarioId };
      }
    });

    isEvalRunning = false;
    res.json({ success: true, data: report });
  } catch (err) {
    isEvalRunning = false;
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check eval progress
router.get('/evaluator/progress', (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: isEvalRunning,
      progress: currentEvalProgress
    }
  });
});

// Get eval history
router.get('/evaluator/history', (req, res) => {
  try {
    const history = evaluator.getResultsHistory();
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve pending corrections
router.post('/evaluator/approve', (req, res) => {
  try {
    const { evalIndex, correctionIndices } = req.body;
    const result = evaluator.approvePendingCorrections(evalIndex, correctionIndices);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get test scenarios
router.get('/evaluator/scenarios', (req, res) => {
  try {
    const scenarios = evaluator.loadTestSuite();
    res.json({ success: true, data: scenarios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start continuous autonomous training
router.post('/evaluator/continuous/start', async (req, res) => {
  try {
    const { hours } = req.body;
    const result = await evaluator.startContinuousLoop(parseFloat(hours) || 1);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stop continuous training and get final report
router.post('/evaluator/continuous/stop', (req, res) => {
  try {
    const result = evaluator.stopContinuousLoop();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get continuous training status
router.get('/evaluator/continuous/status', (req, res) => {
  try {
    const status = evaluator.getContinuousStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ Midtrans Payment API ============
const midtrans = require('../services/midtransService');

// Webhook HTTP Notification dari Midtrans
router.post('/midtrans/notification', async (req, res) => {
  try {
    const whatsappService = require('../services/whatsappService');
    const sendFn = whatsappService.getSock ? (jid, msgObj) => whatsappService.getSock().sendMessage(jid, msgObj) : null;
    
    const result = await midtrans.processNotification(req.body, sendFn);
    res.status(200).json(result);
  } catch (err) {
    console.error('[API-MIDTRANS] Error notification:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Snap Payment Link
router.post('/midtrans/create-link', async (req, res) => {
  try {
    const { orderId, amount, customerName, customerPhone } = req.body;
    const result = await midtrans.createSnapTransaction(orderId, amount, customerName, customerPhone);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check Midtrans Config Status
router.get('/midtrans/config', (req, res) => {
  try {
    const config = midtrans.getConfig();
    res.json({
      success: true,
      data: {
        merchantId: config.merchantId,
        clientKey: config.clientKey,
        isProduction: config.isProduction,
        webhookUrl: "http://localhost:3000/api/midtrans/notification"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;



