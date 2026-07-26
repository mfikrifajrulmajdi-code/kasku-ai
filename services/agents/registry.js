// ============================================================================
// AGENT REGISTRY — Pola terinspirasi dari AWS Multi-Agent Orchestrator
// Setiap agen mendaftarkan dirinya sendiri. Router membaca daftar ini.
// ============================================================================

const fs = require('fs');
const path = require('path');

const agents = {};

/**
 * Mendaftarkan agen ke registry
 * @param {Object} agent - Modul agen dengan id, name, description, handle()
 */
function register(agent) {
    if (!agent.id || !agent.name || !agent.handle) {
        console.error(`[REGISTRY] ❌ Agen gagal didaftarkan: missing id/name/handle`);
        return;
    }
    agents[agent.id] = agent;
    console.log(`[REGISTRY] ✅ Agen "${agent.name}" (${agent.id}) terdaftar.`);
}

/**
 * Ambil semua agen yang terdaftar
 * @returns {Array} Array of agent objects
 */
function getAll() {
    return Object.values(agents);
}

/**
 * Ambil agen berdasarkan ID intent
 * @param {string} id - Intent ID (misal: "SALES", "CS")
 * @returns {Object|null} Agent object atau null
 */
function getById(id) {
    return agents[id] || null;
}

/**
 * Generate deskripsi semua agen untuk prompt Router (Dynamic Router Prompt)
 * @returns {string} Numbered list of agent descriptions
 */
function getAgentDescriptions() {
    return Object.values(agents)
        .map((a, i) => `${i + 1}. ${a.id}: ${a.description}`)
        .join('\n');
}

/**
 * Auto-load semua file agen dari folder ini dan daftarkan
 */
function autoRegisterAll() {
    const agentDir = __dirname;
    const files = fs.readdirSync(agentDir);

    for (const file of files) {
        // Skip registry.js dan routerAgent.js (router bukan agen biasa)
        if (file === 'registry.js' || file === 'routerAgent.js') continue;
        if (!file.endsWith('Agent.js')) continue;

        try {
            const agent = require(path.join(agentDir, file));
            register(agent);
        } catch (err) {
            console.error(`[REGISTRY] ❌ Gagal load ${file}:`, err.message);
        }
    }

    console.log(`[REGISTRY] 📋 Total ${Object.keys(agents).length} agen terdaftar.`);
}

module.exports = { register, getAll, getById, getAgentDescriptions, autoRegisterAll };
