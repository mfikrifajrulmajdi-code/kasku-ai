// ============================================================================
// DEVELOPER API SERVICE — API Key Generator & Visual Webhook Field Mapper
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GLOBAL_CONFIG_DIR = path.join(__dirname, '..', 'config');

function getTenantDir(tenantId) {
    if (!tenantId || tenantId === 'default' || tenantId === 'global') return GLOBAL_CONFIG_DIR;
    const tenantDir = path.join(__dirname, '..', 'tenants', tenantId, 'config');
    if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });
    return tenantDir;
}

function getDeveloperConfigPath(tenantId) {
    return path.join(getTenantDir(tenantId), 'developer_config.json');
}

function getDeveloperConfig(tenantId = 'default') {
    const filePath = getDeveloperConfigPath(tenantId);
    if (!fs.existsSync(filePath)) {
        return {
            apiKeys: [],
            webhookMappings: [
                {
                    sourceName: 'Google Forms',
                    fieldMap: {
                        'Nama Lengkap': 'name',
                        'Nomor WhatsApp': 'phone',
                        'Pilihan Produk': 'notes'
                    },
                    templateText: 'Halo Kak {name}! Terima kasih sudah mengisi formulir untuk pesanan {notes}. Tim kami akan segera menghubungi Kakak.'
                }
            ]
        };
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return { apiKeys: [], webhookMappings: [] };
    }
}

function saveDeveloperConfig(tenantId, config) {
    fs.writeFileSync(getDeveloperConfigPath(tenantId), JSON.stringify(config, null, 2), 'utf8');
    return config;
}

function generateAPIKey(tenantId = 'default', keyName = 'Live Key') {
    const config = getDeveloperConfig(tenantId);
    const rawKey = 'zk_live_' + crypto.randomBytes(24).toString('hex');

    const keyEntry = {
        id: 'key_' + Date.now(),
        name: keyName,
        apiKey: rawKey,
        createdAt: new Date().toISOString(),
        lastUsedAt: null
    };

    config.apiKeys.push(keyEntry);
    saveDeveloperConfig(tenantId, config);
    return keyEntry;
}

function revokeAPIKey(tenantId = 'default', keyId) {
    const config = getDeveloperConfig(tenantId);
    config.apiKeys = config.apiKeys.filter(k => k.id !== keyId);
    saveDeveloperConfig(tenantId, config);
    return { success: true };
}

function authenticateAPIKey(apiKey) {
    if (!apiKey) return null;

    // Search global and tenant dirs
    const searchDirs = [GLOBAL_CONFIG_DIR];
    const tenantsDir = path.join(__dirname, '..', 'tenants');
    if (fs.existsSync(tenantsDir)) {
        fs.readdirSync(tenantsDir).forEach(t => searchDirs.push(path.join(tenantsDir, t, 'config')));
    }

    for (const dir of searchDirs) {
        const filePath = path.join(dir, 'developer_config.json');
        if (fs.existsSync(filePath)) {
            try {
                const conf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const matchedKey = (conf.apiKeys || []).find(k => k.apiKey === apiKey);
                if (matchedKey) {
                    const tenantId = path.basename(path.dirname(dir));
                    matchedKey.lastUsedAt = new Date().toISOString();
                    fs.writeFileSync(filePath, JSON.stringify(conf, null, 2), 'utf8');
                    return { tenantId: tenantId === 'wa-control-center' ? 'default' : tenantId, keyInfo: matchedKey };
                }
            } catch (e) {}
        }
    }
    return null;
}

/**
 * Pemeta payload JSON webhook ke teks pesan terformat
 */
function mapWebhookPayloadToMessage(payload, fieldMap, templateText) {
    let resultText = templateText || '';
    const extractedData = {};

    for (const [sourceField, targetVar] of Object.entries(fieldMap)) {
        const val = payload[sourceField] || payload[sourceField.toLowerCase()] || '';
        extractedData[targetVar] = val;
        resultText = resultText.replace(new RegExp(`\\{${targetVar}\\}`, 'gi'), val);
    }

    return {
        extractedData,
        formattedMessage: resultText
    };
}

module.exports = {
    getDeveloperConfig,
    saveDeveloperConfig,
    generateAPIKey,
    revokeAPIKey,
    authenticateAPIKey,
    mapWebhookPayloadToMessage
};
