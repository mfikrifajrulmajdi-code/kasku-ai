// ============================================================================
// SEQUENCE ENGINE — Multi-Step Drip Campaign Pipeline
// Pembuat urutan pesan berantai otomatis berbasis waktu (H+0, H+1, H+3, H+7)
// ============================================================================

const fs = require('fs');
const path = require('path');
const whatsappService = require('./whatsappService');
const { parseSpintax } = require('./spintaxParser');

const GLOBAL_CONFIG_DIR = path.join(__dirname, '..', 'config');

function getTenantDir(tenantId) {
    if (!tenantId || tenantId === 'default' || tenantId === 'global') return GLOBAL_CONFIG_DIR;
    const tenantDir = path.join(__dirname, '..', 'tenants', tenantId, 'config');
    if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });
    return tenantDir;
}

function getSequencesPath(tenantId) {
    return path.join(getTenantDir(tenantId), 'sequences.json');
}

function getActivePipelinePath(tenantId) {
    return path.join(getTenantDir(tenantId), 'sequence_pipeline.json');
}

function getSequences(tenantId = 'default') {
    const filePath = getSequencesPath(tenantId);
    if (!fs.existsSync(filePath)) {
        return [
            {
                id: 'seq_welcome',
                name: 'Welcome Sequence (Pelanggan Baru)',
                trigger: 'opt_in',
                steps: [
                    { delayDays: 0, text: 'Halo Kak {nama}! Selamat datang di {store_name}. Ada yang bisa kami bantu hari ini? 😊' },
                    { delayDays: 1, text: 'Hai Kak {nama}, sudah lihat katalog terbaru kami? Dapatkan diskon 10% untuk transaksi pertama Kakak!' },
                    { delayDays: 3, text: 'Halo Kak {nama}, voucher diskon 10% Kakak akan berakhir esok hari. Yuk checkout sekarang!' }
                ]
            }
        ];
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
}

function saveSequences(tenantId, sequences) {
    fs.writeFileSync(getSequencesPath(tenantId), JSON.stringify(sequences, null, 2), 'utf8');
    return sequences;
}

function getPipeline(tenantId = 'default') {
    const filePath = getActivePipelinePath(tenantId);
    if (!fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return []; }
}

function savePipeline(tenantId, pipeline) {
    fs.writeFileSync(getActivePipelinePath(tenantId), JSON.stringify(pipeline, null, 2), 'utf8');
}

/**
 * Mendaftarkan kontak ke dalam Drip Sequence Pipeline
 */
function enrollContactInSequence(tenantId, phone, contactName, sequenceId) {
    const sequences = getSequences(tenantId);
    const seq = sequences.find(s => s.id === sequenceId);
    if (!seq) throw new Error('Sequence tidak ditemukan');

    const pipeline = getPipeline(tenantId);
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Hapus pendaftaran lama jika ada
    const filtered = pipeline.filter(p => !(p.phone === cleanPhone && p.sequenceId === sequenceId));

    const now = Date.now();
    seq.steps.forEach((step, stepIndex) => {
        const scheduledTime = now + (step.delayDays * 24 * 60 * 60 * 1000);
        filtered.push({
            id: 'pipe_' + Date.now() + '_' + stepIndex,
            tenantId,
            sequenceId,
            phone: cleanPhone,
            contactName: contactName || 'Pelanggan',
            stepIndex,
            delayDays: step.delayDays,
            text: step.text,
            scheduledTime: new Date(scheduledTime).toISOString(),
            status: 'pending' // pending, sent, failed
        });
    });

    savePipeline(tenantId, filtered);
    return { success: true, enrolledSteps: seq.steps.length };
}

/**
 * Cron Runner untuk memproses antrean pesan Drip Campaign yang sudah jatuh tempo
 */
async function processSequenceCron(tenantId = 'default') {
    const sock = whatsappService.getSock ? whatsappService.getSock() : null;
    if (!sock) return;

    const pipeline = getPipeline(tenantId);
    const now = Date.now();
    let updated = false;

    for (const item of pipeline) {
        if (item.status === 'pending' && new Date(item.scheduledTime).getTime() <= now) {
            try {
                const jid = item.phone + '@s.whatsapp.net';
                const messageText = parseSpintax(item.text).replace(/\{nama\}/gi, item.contactName);

                await sock.sendMessage(jid, { text: messageText });
                item.status = 'sent';
                item.sentAt = new Date().toISOString();
                updated = true;
                console.log(`[DRIP-SEQUENCE] ⏳ Sent step ${item.stepIndex} to ${item.phone}`);
            } catch (err) {
                item.status = 'failed';
                item.error = err.message;
                updated = true;
            }
        }
    }

    if (updated) {
        savePipeline(tenantId, pipeline);
    }
}

module.exports = {
    getSequences,
    saveSequences,
    getPipeline,
    enrollContactInSequence,
    processSequenceCron
};
