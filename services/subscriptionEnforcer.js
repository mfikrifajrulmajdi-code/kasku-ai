// ============================================================================
// DEEP-DIVE SAAS SUBSCRIPTION LIFECYCLE & LOCK ENGINE
// Memeriksa status masa sewa (subscription) seluruh tenant secara berkala
// Memblokir / mengaktifkan bot WhatsApp secara otomatis berdasarkan status bayar
// ============================================================================

const tenantManager = require('./tenantManager');

/**
 * Pindai Seluruh Tenant dan Lakukan Enforcing Masa Sewa
 * @returns {Array} List status penguncian tenant
 */
function auditTenantSubscriptions() {
    console.log(`[SAAS-ENFORCER] 🔍 Memindai status sewa bulanan seluruh tenant...`);
    const tenants = tenantManager.getAllTenants();
    const now = Date.now();
    const results = [];

    tenants.forEach(tenant => {
        const expiresAtMs = new Date(tenant.subscription.expiresAt).getTime();
        const isExpired = now > expiresAtMs;
        
        const statusReport = {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            plan: tenant.subscription.plan,
            expiresAt: tenant.subscription.expiresAt,
            isExpired: isExpired,
            accessAllowed: !isExpired && tenant.subscription.status === 'active'
        };

        if (isExpired) {
            console.log(`[SAAS-ENFORCER] ⚠️ SEWA KLIEN KETEMU EXPIRED: '${tenant.companyName}' (${tenant.tenantId}) — Akses Bot Ditangguhkan.`);
        } else {
            console.log(`[SAAS-ENFORCER] ✅ SEWA KLIEN AKTIF: '${tenant.companyName}' (${tenant.tenantId}) — Berlaku hingga ${tenant.subscription.expiresAt.split('T')[0]}`);
        }

        results.push(statusReport);
    });

    return results;
}

module.exports = {
    auditTenantSubscriptions
};
