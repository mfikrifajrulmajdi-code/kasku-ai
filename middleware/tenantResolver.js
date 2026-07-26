// ============================================================================
// DYNAMIC MULTI-TENANT SUBDOMAIN & HEADER RESOLVER MIDDLEWARE
// Memetakan URL request (subdomain/header/query) ke tenant klien yang sesuai
// ============================================================================

const tenantManager = require('../services/tenantManager');

function tenantResolverMiddleware(req, res, next) {
    let tenantId = 'default';

    // 1. Cek dari Subdomain (misal: glowclinic.kasku.ai)
    const host = req.headers.host || '';
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'localhost') {
        tenantId = parts[0];
    }

    // 2. Override via Query Parameter / Header (misal: ?tenant=glowclinic)
    if (req.query.tenant) {
        tenantId = req.query.tenant;
    } else if (req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
    }

    // 3. Ambil Konfigurasi Tenant dari Tenant Manager
    let tenantConfig = tenantManager.getTenantConfig(tenantId);
    if (!tenantConfig && tenantId !== 'default') {
        // Fallback jika ID tenant tidak ditemukan
        tenantId = 'default';
        tenantConfig = tenantManager.getTenantConfig('default');
    }

    req.tenantId = tenantId;
    req.tenantConfig = tenantConfig || {
        companyName: "KasKu Store Flagship",
        industry: "General E-Commerce",
        agents: {
            SALES: { name: "Bima" },
            OPS: { name: "Citra" }
        }
    };

    console.log(`[TENANT-RESOLVER] 🌐 Web Request dari Host '${host}' dipetakan ke Tenant: '${req.tenantConfig.companyName}' (${req.tenantId})`);
    next();
}

module.exports = tenantResolverMiddleware;
