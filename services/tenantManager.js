// ============================================================================
// B2B SAAS MULTI-TENANT WHITE-LABEL MANAGEMENT ENGINE
// Mengisolasi data, sesi WhatsApp, nama agen, dan kredensial pembayaran per klien (Tenant)
// ============================================================================

const fs = require('fs');
const path = require('path');

const TENANTS_DIR = path.join(__dirname, '..', 'tenants');

function ensureTenantsDir() {
    if (!fs.existsSync(TENANTS_DIR)) {
        fs.mkdirSync(TENANTS_DIR, { recursive: true });
    }
}

/**
 * Buat Tenant Klien Baru (White-Label SaaS)
 * @param {string} tenantId - ID unik klien (misal: "glowclinic", "autoparts", "dapurmama")
 * @param {Object} tenantConfig - Konfigurasi Merek, Agen, & Kredensial Klien
 */
function createTenant(tenantId, tenantConfig) {
    ensureTenantsDir();
    const tenantFolder = path.join(TENANTS_DIR, tenantId);
    if (!fs.existsSync(tenantFolder)) {
        fs.mkdirSync(tenantFolder, { recursive: true });
        fs.mkdirSync(path.join(tenantFolder, 'config'), { recursive: true });
        fs.mkdirSync(path.join(tenantFolder, 'sessions'), { recursive: true });
    }

    const defaultConfig = {
        tenantId,
        companyName: tenantConfig.companyName || "White-Label Store",
        logoUrl: tenantConfig.logoUrl || "/favicon.ico",
        industry: tenantConfig.industry || "General E-Commerce", // Beauty, Sparepart, Restaurant
        subscription: {
            plan: tenantConfig.plan || "Pro", // Basic, Pro, Enterprise
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 Hari
        },
        paymentGateway: {
            merchantId: tenantConfig.midtransMerchantId || "",
            serverKey: tenantConfig.midtransServerKey || "",
            clientKey: tenantConfig.midtransClientKey || ""
        },
        // Kustomisasi 10 Agen AI Per Klien
        agents: tenantConfig.agents || {
            SALES: { id: 'SALES', name: tenantConfig.salesName || 'Bima', title: 'Konsultan Sales' },
            OPS: { id: 'OPS', name: tenantConfig.opsName || 'Citra', title: 'Kasir & Admin' },
            CS: { id: 'CS', name: tenantConfig.csName || 'Aika', title: 'Customer Service' },
            COMPLAINT: { id: 'COMPLAINT', name: tenantConfig.complaintName || 'Deni', title: 'Handling Komplain' },
            SUPPORT: { id: 'SUPPORT', name: tenantConfig.supportName || 'Eka', title: 'Tech Support' },
            HR: { id: 'HR', name: tenantConfig.hrName || 'Fira', title: 'Internal HR' },
            MARKETING: { id: 'MARKETING', name: tenantConfig.marketingName || 'Gita', title: 'Promosi & Retention' },
            FINANCE: { id: 'FINANCE', name: tenantConfig.financeName || 'Hadi', title: 'Keuangan' },
            ADMIN: { id: 'ADMIN', name: tenantConfig.adminName || 'Iwan', title: 'Executive Admin' },
            PROCUREMENT: { id: 'PROCUREMENT', name: tenantConfig.procurementName || 'Joko', title: 'Gudang & Supplier' }
        },
        createdAt: new Date().toISOString()
    };

    const configPath = path.join(tenantFolder, 'config', 'tenant_config.json');
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');

    console.log(`[SAAS-TENANT-ENGINE] 🏢 Tenant Klien '${tenantConfig.companyName}' (${tenantId}) berhasil dibuat!`);
    return defaultConfig;
}

/**
 * Ambil Konfigurasi Tenant
 */
function getTenantConfig(tenantId) {
    const configPath = path.join(TENANTS_DIR, tenantId, 'config', 'tenant_config.json');
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {}
    return null;
}

/**
 * Dapatkan Daftar Seluruh Klien Terdaftar (Super Admin Dashboard)
 */
function getAllTenants() {
    ensureTenantsDir();
    const directories = fs.readdirSync(TENANTS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const tenants = [];
    directories.forEach(tId => {
        const cfg = getTenantConfig(tId);
        if (cfg) tenants.push(cfg);
    });

    return tenants;
}

module.exports = {
    createTenant,
    getTenantConfig,
    getAllTenants
};
