// ============================================================================
// EXTENSION API ROUTES (Phase 3 & 4) — Inbox, Groups, Sequences, Dev API, Billing
// ============================================================================

const express = require('express');
const router = express.Router();

const inboxStore = require('../services/inboxStore');
const groupAutomationService = require('../services/groupAutomationService');
const sequenceEngine = require('../services/sequenceEngine');
const developerApiService = require('../services/developerApiService');
const subscriptionBillingService = require('../services/subscriptionBillingService');
const whatsappService = require('../services/whatsappService');

function getTenantId(req) {
    return req.query.tenantId || req.body.tenantId || 'default';
}

// 1. Live Chat Inbox & Human Takeover Endpoints
router.get('/inbox/chats', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const chats = inboxStore.getInboxChats(tenantId);
        res.json({ success: true, data: chats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/inbox/takeover', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { phone, active } = req.body;
        if (!phone) return res.status(400).json({ success: false, error: 'Nomor telepon required' });
        const result = inboxStore.setTakeoverMode(tenantId, phone, active);
        res.json({ success: true, data: result, message: `Human CS Takeover ${active ? 'AKTIF (AI Mati)' : 'NONAKTIF (AI Hidup)'}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/inbox/send-reply', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { phone, text } = req.body;
        if (!phone || !text) return res.status(400).json({ success: false, error: 'Phone & text required' });

        const sock = whatsappService.getSock ? whatsappService.getSock() : null;
        if (!sock) return res.status(503).json({ success: false, error: 'WhatsApp tidak terhubung' });

        const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text });

        // Record ke inbox
        const chat = inboxStore.recordInboxMessage(tenantId, phone, 'CS Human', text, 'outgoing');
        res.json({ success: true, data: chat, message: 'Pesan terkirim' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. WhatsApp Group Automation Endpoints
router.get('/groups/config', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const config = groupAutomationService.getGroupConfig(tenantId);
        res.json({ success: true, data: config });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/groups/config', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const updated = groupAutomationService.saveGroupConfig(tenantId, req.body);
        res.json({ success: true, data: updated, message: 'Pengaturan grup disimpan' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/groups/extract-csv', async (req, res) => {
    try {
        const { groupJid } = req.query;
        if (!groupJid) return res.status(400).json({ success: false, error: 'groupJid required' });
        const sock = whatsappService.getSock ? whatsappService.getSock() : null;
        const result = await groupAutomationService.extractGroupMembersToCSV(sock, groupJid);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=group-members.csv`);
        res.send(result.csv);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Drip Campaign Sequence Endpoints
router.get('/sequences', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const seqs = sequenceEngine.getSequences(tenantId);
        res.json({ success: true, data: seqs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/sequences', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const seqs = sequenceEngine.saveSequences(tenantId, req.body);
        res.json({ success: true, data: seqs, message: 'Drip sequence disimpan' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/sequences/enroll', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { phone, contactName, sequenceId } = req.body;
        const result = sequenceEngine.enrollContactInSequence(tenantId, phone, contactName, sequenceId);
        res.json({ success: true, data: result, message: 'Kontak berhasil mendaftar ke drip sequence' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Developer API Portal & Webhook Mapper Endpoints
router.get('/developer/keys', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const conf = developerApiService.getDeveloperConfig(tenantId);
        res.json({ success: true, data: conf });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/developer/generate-key', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const key = developerApiService.generateAPIKey(tenantId, req.body.keyName || 'Live Key');
        res.json({ success: true, data: key, message: 'API Key baru berhasil dibuat' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/developer/revoke-key', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const result = developerApiService.revokeAPIKey(tenantId, req.body.keyId);
        res.json({ success: true, data: result, message: 'API Key dicabut' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Billing & Subscription Portal Endpoints
router.get('/billing/plans', (req, res) => {
    res.json({ success: true, data: subscriptionBillingService.getPricingPlans() });
});

router.post('/billing/checkout', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { planKey, customerName, customerPhone } = req.body;
        const checkout = await subscriptionBillingService.createPlanSubscriptionCheckout(
            tenantId, planKey, customerName, customerPhone
        );
        res.json({ success: true, data: checkout });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
