// ============================================================================
// INBOX STORE — Shared Live Chat Inbox & Human CS Takeover Engine
// Mengelola obrolan langsung & toggle matikan AI per obrolan (Takeover Mode)
// ============================================================================

const fs = require('fs');
const path = require('path');

const GLOBAL_CONFIG_DIR = path.join(__dirname, '..', 'config');

function getTenantDir(tenantId) {
    if (!tenantId || tenantId === 'default' || tenantId === 'global') return GLOBAL_CONFIG_DIR;
    const tenantDir = path.join(__dirname, '..', 'tenants', tenantId, 'config');
    if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });
    return tenantDir;
}

function getInboxPath(tenantId) {
    return path.join(getTenantDir(tenantId), 'inbox_chats.json');
}

function getInboxChats(tenantId = 'default') {
    const filePath = getInboxPath(tenantId);
    if (!fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return []; }
}

function saveInboxChats(tenantId, chats) {
    const filePath = getInboxPath(tenantId);
    // Simpan max 500 chat threads per tenant
    fs.writeFileSync(filePath, JSON.stringify(chats.slice(-500), null, 2), 'utf8');
}

/**
 * Menyimpan/memperbarui pesan masuk atau keluar dalam inbox thread
 */
function recordInboxMessage(tenantId = 'default', phone, senderName, text, direction = 'incoming', mediaUrl = null) {
    const chats = getInboxChats(tenantId);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const now = new Date().toISOString();

    let chat = chats.find(c => c.phone === cleanPhone);

    const msgObj = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        direction, // 'incoming' (dari pelanggan) atau 'outgoing' (dari AI/Human CS)
        senderName: direction === 'incoming' ? (senderName || cleanPhone) : 'CS / AI Agent',
        text,
        mediaUrl,
        timestamp: now
    };

    if (chat) {
        chat.lastMessage = text;
        chat.lastMessageTime = now;
        if (direction === 'incoming') chat.unreadCount = (chat.unreadCount || 0) + 1;
        chat.messages.push(msgObj);
        if (chat.messages.length > 100) chat.messages = chat.messages.slice(-100);
    } else {
        chat = {
            id: 'chat_' + cleanPhone,
            phone: cleanPhone,
            contactName: senderName || cleanPhone,
            unreadCount: direction === 'incoming' ? 1 : 0,
            aiTakeover: false, // Default false (AI aktif)
            lastMessage: text,
            lastMessageTime: now,
            messages: [msgObj]
        };
        chats.push(chat);
    }

    saveInboxChats(tenantId, chats);
    return chat;
}

/**
 * Toggle Human CS Takeover (Matikan/Hidupkan AI per nomor kontak)
 */
function setTakeoverMode(tenantId = 'default', phone, isTakeoverActive) {
    const chats = getInboxChats(tenantId);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const chat = chats.find(c => c.phone === cleanPhone);

    if (chat) {
        chat.aiTakeover = !!isTakeoverActive;
        saveInboxChats(tenantId, chats);
        return { phone: cleanPhone, aiTakeover: chat.aiTakeover };
    }
    return { phone: cleanPhone, aiTakeover: !!isTakeoverActive };
}

function isTakeoverActive(tenantId = 'default', phone) {
    const chats = getInboxChats(tenantId);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const chat = chats.find(c => c.phone === cleanPhone);
    return chat ? !!chat.aiTakeover : false;
}

function markAsRead(tenantId = 'default', phone) {
    const chats = getInboxChats(tenantId);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const chat = chats.find(c => c.phone === cleanPhone);
    if (chat) {
        chat.unreadCount = 0;
        saveInboxChats(tenantId, chats);
    }
}

module.exports = {
    getInboxChats,
    recordInboxMessage,
    setTakeoverMode,
    isTakeoverActive,
    markAsRead
};
