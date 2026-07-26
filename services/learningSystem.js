// ============================================================================
// SELF-LEARNING AI SYSTEM
// Menyimpan koreksi, contoh bagus, dan knowledge base ke file JSON
// ============================================================================

const fs = require('fs');
const path = require('path');

const LESSONS_PATH = path.join(__dirname, '..', 'config', 'lessons.json');
const EXAMPLES_PATH = path.join(__dirname, '..', 'config', 'examples.json');
const KNOWLEDGE_PATH = path.join(__dirname, '..', 'config', 'knowledge.json');

// ---- Helpers: Load & Save ----
function loadJSON(filePath, defaultValue = {}) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (err) {
        console.error(`[LEARNING] ❌ Gagal load ${filePath}:`, err.message);
    }
    return defaultValue;
}

function saveJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error(`[LEARNING] ❌ Gagal save ${filePath}:`, err.message);
    }
}

// ============================================================================
// 1. CORRECTION MEMORY (Bos mengoreksi → AI ingat selamanya)
// ============================================================================

/**
 * Simpan koreksi dari Owner ke agen tertentu
 * @param {string} agentId - ID agen target (misal: "SALES", "ROUTER")
 * @param {string} lesson - Teks koreksi
 * @param {string} source - "owner_correction" | "auto_learned"
 */
function addLesson(agentId, lesson, source = 'owner_correction') {
    const lessons = loadJSON(LESSONS_PATH, {});
    if (!lessons[agentId]) lessons[agentId] = [];

    // Cegah duplikat
    const exists = lessons[agentId].some(l => l.lesson === lesson);
    if (exists) return false;

    lessons[agentId].push({
        lesson,
        source,
        date: new Date().toISOString().split('T')[0],
        importance: source === 'owner_correction' ? 'high' : 'medium'
    });

    // Batasi maksimal 50 lessons per agen agar prompt tidak terlalu panjang
    if (lessons[agentId].length > 50) {
        lessons[agentId] = lessons[agentId].slice(-50);
    }

    saveJSON(LESSONS_PATH, lessons);
    console.log(`[LEARNING] 📝 Lesson ditambahkan untuk ${agentId}: "${lesson.substring(0, 60)}..."`);
    return true;
}

/**
 * Ambil semua lessons untuk agen tertentu
 * @param {string} agentId - ID agen
 * @returns {Array} Array of lesson objects
 */
function getLessons(agentId) {
    const lessons = loadJSON(LESSONS_PATH, {});
    return lessons[agentId] || [];
}

// ============================================================================
// 2. FEW-SHOT EXAMPLE BANK (Contoh jawaban bagus)
// ============================================================================

/**
 * Simpan contoh jawaban bagus
 * @param {string} agentId - ID agen
 * @param {string} input - Pertanyaan/pesan pelanggan
 * @param {string} idealResponse - Jawaban yang bagus
 */
function addExample(agentId, input, idealResponse) {
    const examples = loadJSON(EXAMPLES_PATH, {});
    if (!examples[agentId]) examples[agentId] = [];

    examples[agentId].push({
        input,
        idealResponse,
        date: new Date().toISOString().split('T')[0]
    });

    // Batasi 20 contoh per agen
    if (examples[agentId].length > 20) {
        examples[agentId] = examples[agentId].slice(-20);
    }

    saveJSON(EXAMPLES_PATH, examples);
    console.log(`[LEARNING] ⭐ Contoh bagus disimpan untuk ${agentId}`);
    return true;
}

/**
 * Ambil contoh jawaban bagus untuk agen tertentu (max 3 terbaru)
 * @param {string} agentId - ID agen
 * @returns {Array}
 */
function getExamples(agentId) {
    const examples = loadJSON(EXAMPLES_PATH, {});
    const agentExamples = examples[agentId] || [];
    return agentExamples.slice(-3); // 3 contoh terbaru
}

// ============================================================================
// 3. KNOWLEDGE BASE GROWTH
// ============================================================================

/**
 * Tambah knowledge baru (produk, kebijakan, FAQ custom)
 * @param {string} category - "products" | "policies" | "faq_custom"
 * @param {Object} data - Data knowledge baru
 */
function addKnowledge(category, data) {
    const knowledge = loadJSON(KNOWLEDGE_PATH, { products: [], policies: [], faq_custom: [] });
    if (!knowledge[category]) knowledge[category] = [];

    knowledge[category].push({
        ...data,
        added: new Date().toISOString().split('T')[0]
    });

    saveJSON(KNOWLEDGE_PATH, knowledge);
    console.log(`[LEARNING] 🧠 Knowledge baru ditambahkan ke ${category}`);
    return true;
}

/**
 * Ambil seluruh knowledge base
 * @returns {Object}
 */
function getKnowledge() {
    return loadJSON(KNOWLEDGE_PATH, { products: [], policies: [], faq_custom: [] });
}

// ============================================================================
// 4. AUTO-LEARNING HELPERS
// ============================================================================

/**
 * Deteksi dan proses perintah belajar dari Owner
 * @param {string} messageText - Pesan dari Owner
 * @param {string} lastAgentId - ID agen terakhir yang merespons
 * @param {Array} history - Riwayat percakapan
 * @returns {Object|null} { handled: true, reply: "..." } atau null jika bukan perintah belajar
 */
function processLearningCommand(messageText, lastAgentId, history) {
    const text = messageText.trim();

    // Perintah: "koreksi: <teks koreksi>"
    if (text.toLowerCase().startsWith('koreksi:')) {
        const lesson = text.substring(8).trim();
        if (lesson.length < 5) {
            return { handled: true, reply: '⚠️ Koreksi terlalu pendek. Contoh: "koreksi: harga sandal sekarang 65rb bukan 50rb"' };
        }
        const targetAgent = lastAgentId || 'CS';
        addLesson(targetAgent, lesson, 'owner_correction');
        return {
            handled: true,
            reply: `✅ *Koreksi dicatat untuk Agen ${targetAgent}!*\n\n📝 "${lesson}"\n\nSemua respons ${targetAgent} berikutnya akan mematuhi koreksi ini.`
        };
    }

    // Perintah: "bagus: <komentar>"
    if (text.toLowerCase().startsWith('bagus:')) {
        const comment = text.substring(6).trim();
        if (history && history.length >= 2) {
            const lastUserMsg = history.filter(h => h.role === 'user').pop();
            const lastBotMsg = history.filter(h => h.role === 'assistant').pop();
            if (lastUserMsg && lastBotMsg) {
                const targetAgent = lastAgentId || 'CS';
                addExample(targetAgent, lastUserMsg.content, lastBotMsg.content);
                return {
                    handled: true,
                    reply: `✅ *Contoh jawaban bagus disimpan untuk Agen ${targetAgent}!*\n\nSaya akan menggunakan gaya jawaban ini sebagai referensi di masa depan. 🌟`
                };
            }
        }
        return {
            handled: true,
            reply: '⚠️ Tidak ada percakapan sebelumnya untuk disimpan sebagai contoh.'
        };
    }

    // Perintah: "info: <informasi baru>"
    if (text.toLowerCase().startsWith('info:')) {
        const info = text.substring(5).trim();
        if (info.length < 5) {
            return { handled: true, reply: '⚠️ Info terlalu pendek. Contoh: "info: mulai besok kita jual Sepatu Premium harga 350rb"' };
        }

        // Coba deteksi apakah ini produk, kebijakan, atau FAQ
        const lowerInfo = info.toLowerCase();
        if (lowerInfo.includes('harga') || lowerInfo.includes('jual') || lowerInfo.includes('produk') || lowerInfo.includes('stok')) {
            addKnowledge('products', { info });
        } else if (lowerInfo.includes('aturan') || lowerInfo.includes('kebijakan') || lowerInfo.includes('diskon') || lowerInfo.includes('retur')) {
            addKnowledge('policies', { rule: info });
        } else {
            addKnowledge('faq_custom', { info });
        }

        // Juga tambahkan sebagai lesson untuk semua agen relevan
        addLesson('SALES', info, 'owner_knowledge');
        addLesson('CS', info, 'owner_knowledge');
        addLesson('OPS', info, 'owner_knowledge');

        return {
            handled: true,
            reply: `✅ *Info baru ditambahkan ke Knowledge Base!*\n\n🧠 "${info}"\n\nSemua agen (Sales, CS, Ops) sudah diupdate dengan informasi ini.`
        };
    }

    return null; // Bukan perintah belajar
}

/**
 * Auto-learn: Deteksi koreksi routing dari Owner
 * @param {string} messageText - Pesan owner
 * @param {string} lastIntent - Intent terakhir yang terdeteksi Router
 * @returns {string|null} Intent yang benar jika ada koreksi, null jika tidak
 */
function detectRoutingCorrection(messageText, lastIntent) {
    const match = messageText.match(/harusnya\s+(SALES|OPS|FINANCE|CS|COMPLAINT|SUPPORT|HR|MARKETING|ADMIN|PROCUREMENT)/i);
    if (match) {
        const correctIntent = match[1].toUpperCase();
        if (correctIntent !== lastIntent) {
            addLesson('ROUTER', `Pesan serupa harus diarahkan ke ${correctIntent}, bukan ${lastIntent}.`, 'auto_learned');
            return correctIntent;
        }
    }
    return null;
}

module.exports = {
    addLesson,
    getLessons,
    addExample,
    getExamples,
    addKnowledge,
    getKnowledge,
    processLearningCommand,
    detectRoutingCorrection
};
