// ============================================================================
// DELIVERY LOG STORE — Tracking Status Pesan WhatsApp (ACK Engine)
// Mencatat status: Sent, Delivered (centang 2 abu), Read (centang 2 biru), Failed
// ============================================================================

const fs = require('fs');
const path = require('path');

const GLOBAL_CONFIG_DIR = path.join(__dirname, '..', 'config');

function getTenantDir(tenantId) {
    if (!tenantId || tenantId === 'default' || tenantId === 'global') {
        return GLOBAL_CONFIG_DIR;
    }
    const tenantDir = path.join(__dirname, '..', 'tenants', tenantId, 'config');
    if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
    }
    return tenantDir;
}

function getLogFilePath(tenantId) {
    return path.join(getTenantDir(tenantId), 'delivery_logs.json');
}

function getLogs(tenantId) {
    const filePath = getLogFilePath(tenantId);
    if (!fs.existsSync(filePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
}

function saveLogs(tenantId, logs) {
    const filePath = getLogFilePath(tenantId);
    // Batasi log maksimal 1000 item per tenant agar tidak menggelembung
    const sliced = logs.slice(-1000);
    fs.writeFileSync(filePath, JSON.stringify(sliced, null, 2), 'utf8');
}

function recordDelivery(tenantId, messageId, phone, status, textSnippet = '', error = null) {
    const logs = getLogs(tenantId);
    const existingIndex = logs.findIndex(l => l.messageId === messageId);
    const now = new Date().toISOString();

    const logEntry = {
        messageId,
        phone: (phone || '').replace(/[^0-9]/g, ''),
        status, // 'sent', 'delivered' (centang 2), 'read' (centang biru), 'failed'
        textSnippet: textSnippet ? textSnippet.substr(0, 100) : '',
        error,
        updatedAt: now,
        createdAt: existingIndex >= 0 ? logs[existingIndex].createdAt : now
    };

    if (existingIndex >= 0) {
        logs[existingIndex] = { ...logs[existingIndex], ...logEntry };
    } else {
        logs.push(logEntry);
    }

    saveLogs(tenantId, logs);
    return logEntry;
}

function updateACKStatus(messageId, ackCode) {
    // ackCode: 1 = SENT, 2 = DELIVERED, 3 = READ
    let status = 'sent';
    if (ackCode === 2) status = 'delivered';
    if (ackCode === 3 || ackCode === 4) status = 'read';

    // Cari di global dan semua folder tenant
    const searchDirs = [GLOBAL_CONFIG_DIR];
    const tenantsDir = path.join(__dirname, '..', 'tenants');
    if (fs.existsSync(tenantsDir)) {
        fs.readdirSync(tenantsDir).forEach(t => {
            searchDirs.push(path.join(tenantsDir, t, 'config'));
        });
    }

    searchDirs.forEach(dir => {
        const filePath = path.join(dir, 'delivery_logs.json');
        if (fs.existsSync(filePath)) {
            try {
                const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const item = logs.find(l => l.messageId === messageId);
                if (item) {
                    item.status = status;
                    item.updatedAt = new Date().toISOString();
                    fs.writeFileSync(filePath, JSON.stringify(logs.slice(-1000), null, 2), 'utf8');
                }
            } catch (e) {}
        }
    });
}

function getDeliveryStats(tenantId) {
    const logs = getLogs(tenantId);
    return {
        total: logs.length,
        sent: logs.filter(l => l.status === 'sent').length,
        delivered: logs.filter(l => l.status === 'delivered').length,
        read: logs.filter(l => l.status === 'read').length,
        failed: logs.filter(l => l.status === 'failed').length
    };
}

module.exports = {
    getLogs,
    recordDelivery,
    updateACKStatus,
    getDeliveryStats
};
