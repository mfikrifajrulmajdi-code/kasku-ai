// ============================================================================
// DEEP-DIVE MULTI-TENANT BAILEYS SOCKET ORCHESTRATOR ENGINE
// Membuka, mengelola, dan mengisolasi koneksi WhatsApp dari puluhan/ratusan klien
// dalam satu server Node.js secara independen (Multi-Instance Manager)
// ============================================================================

const fs = require('fs');
const path = require('path');
const tenantManager = require('./tenantManager');

// In-Memory Store Socket Per Tenant: Map<tenantId, SocketInstance>
const tenantSockets = new Map();
const tenantStatuses = new Map();

/**
 * Mendapatkan Status Koneksi WhatsApp Tenant Tertentu
 */
function getTenantStatus(tenantId) {
    return tenantStatuses.get(tenantId) || { status: 'disconnected', phone: null };
}

/**
 * Memulai Socket WhatsApp Khusus Tenant Tertentu
 * @param {string} tenantId - ID Klien (misal: "glowclinic")
 */
async function startTenantSocket(tenantId) {
    const config = tenantManager.getTenantConfig(tenantId);
    if (!config) {
        throw new Error(`Tenant '${tenantId}' tidak ditemukan di sistem.`);
    }

    console.log(`[MULTI-SOCKET] 🚀 Memulai WhatsApp Socket khusus Tenant: '${config.companyName}' (${tenantId})...`);
    
    // Inisialisasi status awal
    tenantStatuses.set(tenantId, {
        status: 'waiting_scan',
        companyName: config.companyName,
        industry: config.industry,
        startedAt: new Date().toISOString()
    });

    // Catatan: Pada implementasi live Baileys, di sini dipanggil:
    // makeWASocket({ auth: useMultiFileAuthState(path.join(__dirname, '..', 'tenants', tenantId, 'sessions')) })
    
    // Menyimpan mock socket instance ke map
    const mockSocket = {
        tenantId,
        companyName: config.companyName,
        sendMessage: async (jid, content) => {
            console.log(`[MULTI-SOCKET] 📤 [Tenant: ${config.companyName}] Pesan terkirim ke ${jid}:`, content);
        }
    };

    tenantSockets.set(tenantId, mockSocket);
    tenantStatuses.set(tenantId, {
        status: 'connected',
        companyName: config.companyName,
        phone: '6281234567890',
        connectedAt: new Date().toISOString()
    });

    return mockSocket;
}

/**
 * Dapatkan Socket Aktif Tenant
 */
function getTenantSocket(tenantId) {
    return tenantSockets.get(tenantId);
}

/**
 * Daftar Seluruh Socket Aktif (Multi-Tenant Overview)
 */
function listActiveSockets() {
    const list = [];
    tenantStatuses.forEach((status, tenantId) => {
        list.push({ tenantId, ...status });
    });
    return list;
}

module.exports = {
    startTenantSocket,
    getTenantSocket,
    getTenantStatus,
    listActiveSockets
};
