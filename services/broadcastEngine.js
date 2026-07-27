// ============================================================================
// BROADCAST ENGINE — Queueing, Spintax, Anti-Ban Random Delay, & Logging
// ============================================================================

const whatsappService = require('./whatsappService');
const { parseSpintax } = require('./spintaxParser');
const deliveryLogStore = require('./deliveryLogStore');

const activeBroadcastJobs = {};

/**
 * Menjalankan job broadcast massal dengan proteksi anti-ban
 */
async function startBroadcastJob({ tenantId = 'default', recipients, templateText, mediaUrl = null, minDelaySec = 5, maxDelaySec = 15 }) {
    const sock = whatsappService.getSock ? whatsappService.getSock() : null;
    if (!sock) {
        throw new Error('WhatsApp Service belum terhubung');
    }

    const jobId = 'bc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const jobStatus = {
        jobId,
        tenantId,
        total: recipients.length,
        sent: 0,
        failed: 0,
        status: 'running', // running, completed, cancelled
        startTime: new Date().toISOString(),
        logs: []
    };

    activeBroadcastJobs[jobId] = jobStatus;

    // Jalankan di background
    (async () => {
        for (let i = 0; i < recipients.length; i++) {
            if (activeBroadcastJobs[jobId].status === 'cancelled') {
                break;
            }

            const recipient = recipients[i];
            const rawPhone = (typeof recipient === 'string' ? recipient : recipient.phone).replace(/[^0-9]/g, '');
            const recipientName = typeof recipient === 'object' ? (recipient.name || 'Pelanggan') : 'Pelanggan';

            if (!rawPhone) continue;

            const jid = rawPhone + '@s.whatsapp.net';

            // 1. Terapkan Spintax
            let messageText = parseSpintax(templateText);
            messageText = messageText.replace(/\{nama\}/gi, recipientName).replace(/\{phone\}/gi, rawPhone);

            try {
                let sentMsg;
                if (mediaUrl) {
                    sentMsg = await sock.sendMessage(jid, { image: { url: mediaUrl }, caption: messageText });
                } else {
                    sentMsg = await sock.sendMessage(jid, { text: messageText });
                }

                const msgId = sentMsg.key.id;
                activeBroadcastJobs[jobId].sent++;
                activeBroadcastJobs[jobId].logs.push({ phone: rawPhone, status: 'sent', msgId, time: new Date().toISOString() });

                // Record ACK delivery log
                deliveryLogStore.recordDelivery(tenantId, msgId, rawPhone, 'sent', messageText);

            } catch (err) {
                activeBroadcastJobs[jobId].failed++;
                activeBroadcastJobs[jobId].logs.push({ phone: rawPhone, status: 'failed', error: err.message, time: new Date().toISOString() });
                deliveryLogStore.recordDelivery(tenantId, 'err_' + Date.now(), rawPhone, 'failed', messageText, err.message);
            }

            // 2. Anti-Ban Random Delay (contoh: 5 sampai 15 detik acak)
            if (i < recipients.length - 1 && activeBroadcastJobs[jobId].status === 'running') {
                const randomDelay = Math.floor(Math.random() * (maxDelaySec - minDelaySec + 1) + minDelaySec) * 1000;
                await new Promise(res => setTimeout(res, randomDelay));
            }
        }

        if (activeBroadcastJobs[jobId].status !== 'cancelled') {
            activeBroadcastJobs[jobId].status = 'completed';
        }
        activeBroadcastJobs[jobId].endTime = new Date().toISOString();
    })();

    return { jobId, message: 'Broadcast job telah dimasukkan ke antrean' };
}

function getJobStatus(jobId) {
    return activeBroadcastJobs[jobId] || null;
}

function cancelJob(jobId) {
    if (activeBroadcastJobs[jobId]) {
        activeBroadcastJobs[jobId].status = 'cancelled';
        return { success: true, message: `Job ${jobId} dibatalkan` };
    }
    return { success: false, error: 'Job tidak ditemukan' };
}

module.exports = {
    startBroadcastJob,
    getJobStatus,
    cancelJob
};
