// ============================================================================
// AI ENGINE v2.0 — SLIM ORCHESTRATOR
// ============================================================================
// Arsitektur modular terinspirasi dari:
// - AWS Multi-Agent Orchestrator (Agent Registry + Intent Classifier)
// - CrewAI (Role-based agents + Structured Router output)
// - RouteLLM (Cost-based model routing)
// - wa-agent (Modular config per agent)
// ============================================================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const tenantManager = require('./tenantManager');

// Core modules
const registry = require('./agents/registry');
const routerAgent = require('./agents/routerAgent');
const learningSystem = require('./learningSystem');
const cartStore = require('./cartStore');
const orderStore = require('./orderStore');
const stockStore = require('./stockStore');
const menuService = require('./menuService');
const languageService = require('./languageService');
const analyticsService = require('./analyticsService');
const usageMeter = require('./usageMeter');

// ============================================================================
// KONFIGURASI
// ============================================================================


const aiConfigPath = path.join(__dirname, '..', 'config', 'ai-config.json');
const dbPath = path.join(__dirname, '..', 'config', 'database.json');

function getConfigs() {
    const dbConf = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const aiConf = {
        primary: {
            provider: 'gemini',
            url: process.env.GEMINI_API_URL || 'http://100.98.146.119:20128/v1/chat/completions',
            apiKey: process.env.GEMINI_API_KEY || '',
            model: process.env.GEMINI_MODEL || 'antigravity/gemini-3.6-flash-high'
        },
        fallback: {
            provider: 'groq',
            url: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
            apiKey: process.env.GROQ_API_KEY || dbConf.groqApiKey || '',
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
        },
        ownerPhone: process.env.OWNER_PHONE || '628985335666'
    };
    return { aiConf, webhookUrl: dbConf.webhookUrl, groqKey: aiConf.fallback.apiKey };
}

// ============================================================================
// SPEECH TO TEXT (GROQ WHISPER)
// ============================================================================
const FormData = require('form-data');

async function transcribeAudio(audioBuffer) {
    const { groqKey } = getConfigs();
    if (!groqKey) throw new Error("Groq API Key not found");

    const form = new FormData();
    form.append('file', audioBuffer, 'voice.ogg');
    form.append('model', 'whisper-large-v3');

    console.log("🎙️ Mengirim Audio ke Groq Whisper API...");
    try {
        const res = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
            headers: { ...form.getHeaders(), 'Authorization': `Bearer ${groqKey}` },
            timeout: 15000
        });
        return res.data.text;
    } catch (err) {
        console.error("❌ Groq STT Error:", err.message);
        throw new Error("Gagal mentranskripsi suara.");
    }
}

// ============================================================================
// DUAL-LLM DENGAN COST ROUTING (Terinspirasi RouteLLM)
// ============================================================================
async function callLLM(sysPrompt, historyArray, jsonMode = false, imageData = null, complexity = 'heavy') {
    const { aiConf } = getConfigs();

    let messages = [{ role: 'system', content: sysPrompt }];
    if (historyArray) {
        messages = messages.concat(JSON.parse(JSON.stringify(historyArray)));
    }

    // Sisipkan gambar ke pesan terakhir
    if (imageData && messages.length > 1) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'user') {
            const originalText = lastMsg.content;
            lastMsg.content = [
                { type: "text", text: originalText },
                { type: "image_url", image_url: { url: `data:${imageData.mimetype};base64,${imageData.data}` } }
            ];
        }
    }

    // COST ROUTING: light tasks → Groq first, heavy tasks → Gemini first
    const providers = complexity === 'light'
        ? [
            { name: 'Groq (Fast)', url: aiConf.fallback.url, key: aiConf.fallback.apiKey, model: aiConf.fallback.model, timeout: 10000 },
            { name: 'Gemini (Backup)', url: aiConf.primary.url, key: aiConf.primary.apiKey, model: aiConf.primary.model, timeout: 8000 }
          ]
        : [
            { name: 'Gemini (Primary)', url: aiConf.primary.url, key: aiConf.primary.apiKey, model: aiConf.primary.model, timeout: 8000 },
            { name: 'Groq (Fallback)', url: aiConf.fallback.url, key: aiConf.fallback.apiKey, model: aiConf.fallback.model, timeout: 10000 }
          ];

    for (const provider of providers) {
        try {
            const payload = { model: provider.model, messages, temperature: jsonMode ? 0 : 0.7, max_tokens: 500 };
            if (jsonMode) payload.response_format = { type: "json_object" };

            console.log(`🤖 Menghubungi ${provider.name}...`);
            const res = await axios.post(provider.url, payload, {
                headers: { 'Authorization': `Bearer ${provider.key}`, 'Content-Type': 'application/json' },
                timeout: provider.timeout
            });
            return res.data.choices[0].message.content;
        } catch (err) {
            console.error(`⚠️ ${provider.name} gagal:`, err.message);
        }
    }

    // Semua provider gagal
    console.error("❌ Semua AI provider GAGAL");
    return jsonMode ? "{}" : "Maaf, sistem AI kami sedang mengalami gangguan. Mohon coba lagi nanti.";
}

// ============================================================================
// GOOGLE APPS SCRIPT DATABASE CALLER
// ============================================================================
async function callGasDatabase(actionData) {
    const { webhookUrl } = getConfigs();
    if (!webhookUrl) return { status: "error", message: "Webhook URL belum diset di Dashboard" };
    try {
        const res = await axios.post(webhookUrl, actionData, { headers: { 'Content-Type': 'application/json' } });
        return res.data;
    } catch (err) {
        console.error("GAS DB Error:", err.message);
        return { status: "error", message: err.message };
    }
}

// ============================================================================
// INISIALISASI — Auto-register semua agen
// ============================================================================
registry.autoRegisterAll();

// Track last agent per sender (untuk learning system)
const lastAgentPerSender = {};

// ============================================================================
// PROSES PESAN UTAMA (ORCHESTRATOR)
// ============================================================================
async function processMessage(session, sender, messageText, history, imageData = null, tenantId = 'default') {
    const { aiConf } = getConfigs();
    const senderNumber = sender.replace(/\D/g, "");
    const isOwner = (senderNumber === aiConf.ownerPhone || senderNumber === "153463694602350");

    console.log(`\n💬 Memproses pesan dari: ${senderNumber} (Owner: ${isOwner})`);

    // ================================================================
    // STEP 0: Cek perintah Learning (koreksi:, bagus:, info:)
    // ================================================================
    if (isOwner) {
        const learningResult = learningSystem.processLearningCommand(
            messageText,
            lastAgentPerSender[sender],
            history
        );
        if (learningResult && learningResult.handled) {
            return learningResult.reply;
        }
    }

    // ================================================================
    // STEP 0.2: Intercept Menu WhatsApp Utama (1-7 / menu / help)
    // ================================================================
    const menuReply = await menuService.processMenuChoice(messageText, senderNumber, "Kak");
    if (menuReply) {
        console.log(`[MENU-INTERCEPT] 📲 Respon menu instan untuk ${senderNumber}`);
        return menuReply;
    }

    // ================================================================
    // STEP 0.5: Intercept Lacak Pesanan Order ID (#KASKU-XXXX / KASKU-XXXX)
    // ================================================================

    const orderMatch = messageText.match(/#?KASKU-\d{4}/i);
    if (orderMatch) {
        const orderId = orderMatch[0];
        const trackResult = await orderStore.trackOrder(orderId);
        if (trackResult) {
            console.log(`[ORDER-TRACK] 📦 Instant match untuk ${orderId}`);
            return trackResult;
        }
    }



    // ================================================================
    // STEP 1: Tarik data dari Google Sheets
    // ================================================================
    const dbData = await callGasDatabase({ action: "GET_DATA" });
    const KATALOG = dbData.katalog || "Belum ada produk";
    const FAQ = dbData.faq || "Belum ada info FAQ";

    // ================================================================
    // STEP 1.5: USAGE METERING
    // ================================================================
    const tenantConfig = tenantManager.getTenantConfig(tenantId) || {
        tenantId: 'default',
        companyName: 'KasKu Store',
        agents: {
            SALES: { name: 'Bima' }, OPS: { name: 'Citra' }, CS: { name: 'Aika' },
            COMPLAINT: { name: 'Deni' }, SUPPORT: { name: 'Eka' }, HR: { name: 'Fira' },
            MARKETING: { name: 'Gita' }, FINANCE: { name: 'Hadi' }, ADMIN: { name: 'Iwan' },
            PROCUREMENT: { name: 'Joko' }
        }
    };

    const plan = tenantConfig.subscription ? tenantConfig.subscription.plan : 'Pro';
    const usageResult = usageMeter.recordMessage(tenantConfig.tenantId, plan);
    if (!usageResult.allowed) {
        return `⚠️ Maaf, kuota pesan bulanan untuk ${tenantConfig.companyName} telah habis (${usageResult.current}/${usageResult.limit} pesan di bulan ${usageResult.month}). Silakan upgrade paket langganan Anda atau hubungi admin.`;
    }

    // ================================================================
    // STEP 2: SMART ROUTER — Klasifikasi Intent + Sentiment + Urgency
    // ================================================================
    const vendorNumbers = ["628999000111"]; // Daftar nomor vendor yang dikenal
    const routerResult = await routerAgent.classify({
        senderNumber,
        isOwner,
        messageText,
        history,
        imageData,
        callLLM,
        vendorNumbers
    });

    const { intent, sentiment, urgency, summary } = routerResult;
    console.log(`[ORCHESTRATOR] 🎯 Routing ke: ${intent} (${sentiment}/${urgency})`);

    // ================================================================
    // STEP 3: Auto-Learning — Deteksi koreksi routing dari Owner
    // ================================================================
    if (isOwner) {
        const correctedIntent = learningSystem.detectRoutingCorrection(messageText, intent);
        if (correctedIntent) {
            console.log(`[AUTO-LEARN] 🔄 Router dikoreksi: ${intent} → ${correctedIntent}`);
            // Re-route ke agen yang benar
            routerResult.intent = correctedIntent;
        }
    }

    // ================================================================
    // STEP 4: Ambil agen dari Registry & Eksekusi
    // ================================================================
    const agent = registry.getById(routerResult.intent);
    if (!agent) {
        console.error(`[ORCHESTRATOR] ❌ Agen "${routerResult.intent}" tidak ditemukan di Registry!`);
        return "Maaf, terjadi kesalahan internal. Mohon coba lagi.";
    }

    // Track agen terakhir untuk learning system
    lastAgentPerSender[sender] = agent.id;

    const tid = tenantConfig.tenantId || 'default';

    // Bangun context untuk agen
    const agentContext = {
        session,
        sender,
        senderNumber,
        isOwner,
        messageText,
        history,
        imageData,
        katalog: KATALOG,
        faq: FAQ,
        callLLM,
        callGasDatabase,
        learningSystem,
        cartStore: {
            addItem: (sender, item) => cartStore.addItem(sender, item, tid),
            getCart: (sender) => cartStore.getCart(sender, tid),
            removeItem: (sender, identifier) => cartStore.removeItem(sender, identifier, tid),
            clearCart: (sender) => cartStore.clearCart(sender, tid),
            getCartTotal: (sender) => cartStore.getCartTotal(sender, tid),
            formatCartReceipt: (sender, customerName, address) => cartStore.formatCartReceipt(sender, customerName, address, tid)
        },
        orderStore: {
            createOrder: (senderNumber, items, total, address) => orderStore.createOrder(senderNumber, items, total, address, tid),
            trackOrder: (orderId) => orderStore.trackOrder(orderId, tid),
            updateOrderStatus: (orderIdInput, newStatus, resi) => orderStore.updateOrderStatus(orderIdInput, newStatus, resi, tid),
            getOrdersSummary: (senderNumber) => orderStore.getOrdersSummary(senderNumber, tid),
            loadOrders: () => orderStore.loadOrders(tid)
        },
        stockStore: {
            loadStocks: () => stockStore.loadStocks(tid),
            getStock: (sku) => stockStore.getStock(sku, tid),
            deductStock: (sku, qty) => stockStore.deductStock(sku, qty, tid),
            restock: (sku, qty) => stockStore.restock(sku, qty, tid),
            getLowStockAlerts: () => stockStore.getLowStockAlerts(tid),
            getFullStockReport: () => stockStore.getFullStockReport(tid)
        },
        _globalCartStore: cartStore,
        _globalOrderStore: orderStore,
        _globalStockStore: stockStore,
        aiConf: JSON.parse(fs.readFileSync(aiConfigPath, 'utf8')),
        routerMetadata: { intent, sentiment, urgency, summary },
        tenantConfig
    };

    // Eksekusi agen
    try {
        console.log(`[ORCHESTRATOR] 🚀 Menjalankan agen "${agent.name}" (${agent.id})...`);
        const result = await agent.handle(agentContext);

        // Jika result adalah object (special action), kembalikan sebagai JSON string
        if (typeof result === 'object' && result !== null) {
            return JSON.stringify(result);
        }

        return result;
    } catch (err) {
        console.error(`[ORCHESTRATOR] ❌ Agen "${agent.name}" error:`, err.message);

        // Escalation Chain: coba agen fallback
        if (agent.escalateTo) {
            const fallbackAgent = registry.getById(agent.escalateTo);
            if (fallbackAgent) {
                console.log(`[ORCHESTRATOR] 🔄 Eskalasi ke "${fallbackAgent.name}" (${fallbackAgent.id})...`);
                try {
                    const fallbackResult = await fallbackAgent.handle(agentContext);
                    if (typeof fallbackResult === 'object' && fallbackResult !== null) {
                        return JSON.stringify(fallbackResult);
                    }
                    return fallbackResult;
                } catch (e2) {
                    console.error(`[ORCHESTRATOR] ❌ Eskalasi juga gagal:`, e2.message);
                }
            }
        }

        return "Maaf, terjadi gangguan pada sistem. Tim kami sedang memperbaikinya. 🙏";
    }
}

module.exports = { processMessage, transcribeAudio };
