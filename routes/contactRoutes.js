// ============================================================================
// CONTACT & GATEWAY EXTENSION API ROUTES
// Endpoints untuk Contacts, CSV Manager, WA Validator, Spintax & Broadcast
// ============================================================================

const express = require('express');
const router = express.Router();
const contactStore = require('../services/contactStore');
const numberValidatorService = require('../services/numberValidatorService');
const broadcastEngine = require('../services/broadcastEngine');
const spintaxParser = require('../services/spintaxParser');
const deliveryLogStore = require('../services/deliveryLogStore');

function getTenantId(req) {
    return req.query.tenantId || req.body.tenantId || (req.tenant ? req.tenant.id : 'default');
}

// 1. Contact Book Endpoints
router.get('/contacts', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { query, tag, status } = req.query;
        const contacts = contactStore.searchContacts(tenantId, { query, tag, status });
        res.json({ success: true, data: contacts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/contacts', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const contact = contactStore.addOrUpdateContact(tenantId, req.body);
        res.json({ success: true, data: contact, message: 'Kontak berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/contacts/:id', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const result = contactStore.deleteContact(tenantId, req.params.id);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// CSV Import & Export
router.post('/contacts/import-csv', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { csvText } = req.body;
        if (!csvText) return res.status(400).json({ success: false, error: 'Isi CSV (csvText) kosong' });
        const result = contactStore.importContactsFromCSV(tenantId, csvText);
        res.json({ success: true, data: result, message: `Berhasil mengimpor ${result.addedCount} kontak baru (${result.updatedCount} diperbarui)` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/contacts/export-csv', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const csv = contactStore.exportContactsToCSV(tenantId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=contacts-${tenantId}.csv`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. WhatsApp Number Checker
router.post('/tools/validate-numbers', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { phones } = req.body;
        if (!phones || !Array.isArray(phones)) {
            return res.status(400).json({ success: false, error: 'Daftar nomor (phones) tidak valid' });
        }
        const result = await numberValidatorService.validatePhoneNumbers(phones, tenantId);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Spintax Preview & Broadcast Studio
router.post('/broadcast/spintax-preview', (req, res) => {
    try {
        const { text, count } = req.body;
        const previews = spintaxParser.generateVariationsPreview(text, count || 3);
        res.json({ success: true, data: previews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/broadcast/send-job', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { recipients, templateText, mediaUrl, minDelaySec, maxDelaySec } = req.body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ success: false, error: 'Penerima tidak boleh kosong' });
        }
        if (!templateText) {
            return res.status(400).json({ success: false, error: 'Teks pesan tidak boleh kosong' });
        }

        const result = await broadcastEngine.startBroadcastJob({
            tenantId,
            recipients,
            templateText,
            mediaUrl,
            minDelaySec: minDelaySec || 5,
            maxDelaySec: maxDelaySec || 15
        });

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/broadcast/job-status/:jobId', (req, res) => {
    const status = broadcastEngine.getJobStatus(req.params.jobId);
    if (!status) return res.status(404).json({ success: false, error: 'Job tidak ditemukan' });
    res.json({ success: true, data: status });
});

// 4. Delivery Log Receipts
router.get('/delivery/stats', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const stats = deliveryLogStore.getDeliveryStats(tenantId);
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/delivery/logs', (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const logs = deliveryLogStore.getLogs(tenantId);
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
