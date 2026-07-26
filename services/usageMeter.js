// ============================================================================
// USAGE METERING SERVICE — Track pesan per tenant per bulan
// Untuk enforce limit paket langganan SaaS
// ============================================================================

const fs = require('fs');
const path = require('path');

const USAGE_DIR = path.join(__dirname, '..', 'tenants');

function getUsagePath(tenantId) {
    const dir = path.join(USAGE_DIR, tenantId, 'config');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'usage.json');
}

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function loadUsage(tenantId) {
    try {
        const p = getUsagePath(tenantId);
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, 'utf8'));
        }
    } catch (e) {
        console.error(`[USAGE-METER] Error loading usage for ${tenantId}:`, e.message);
    }
    return {};
}

function saveUsage(tenantId, data) {
    try {
        fs.writeFileSync(getUsagePath(tenantId), JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`[USAGE-METER] Error saving usage for ${tenantId}:`, e.message);
    }
}

/**
 * Record 1 message for a tenant. Returns { allowed, current, limit, month }
 */
function recordMessage(tenantId, plan = 'Pro') {
    if (!tenantId || tenantId === 'default') return { allowed: true, current: 0, limit: Infinity, month: getCurrentMonth() };

    const PLAN_LIMITS = {
        'Starter': 500,
        'Basic': 1000,
        'Pro': 5000,
        'Enterprise': 50000
    };
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS['Pro'];
    const month = getCurrentMonth();

    const usage = loadUsage(tenantId);
    if (!usage[month]) {
        usage[month] = { messageCount: 0, firstMessageAt: new Date().toISOString() };
    }
    
    usage[month].messageCount++;
    usage[month].lastMessageAt = new Date().toISOString();
    saveUsage(tenantId, usage);

    const current = usage[month].messageCount;
    const allowed = current <= limit;

    if (!allowed) {
        console.warn(`[USAGE-METER] ⚠️ Tenant '${tenantId}' MELEBIHI KUOTA: ${current}/${limit} (Plan: ${plan})`);
    }

    return { allowed, current, limit, month };
}

/**
 * Get current usage for a tenant
 */
function getUsage(tenantId) {
    if (!tenantId || tenantId === 'default') return { current: 0, limit: Infinity, month: getCurrentMonth() };
    
    const month = getCurrentMonth();
    const usage = loadUsage(tenantId);
    return {
        current: usage[month] ? usage[month].messageCount : 0,
        data: usage,
        month
    };
}

module.exports = { recordMessage, getUsage, getCurrentMonth };
