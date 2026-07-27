// ============================================================================
// CONTACT STORE — Tenant-Scoped Contact & Tagging Manager
// Mengelola data kontak, label/tag, serta ekspor/impor CSV per tenant
// ============================================================================

const fs = require('fs');
const path = require('path');

const GLOBAL_CONFIG_DIR = path.join(__dirname, '..', 'config');

function getTenantDir(tenantId) {
    if (!tenantId || tenantId === 'default' || tenantId === 'global') {
        return GLOBAL_CONFIG_DIR;
    }
    const tenantDir = path.join(__dirname, '..', 'tenants', tenantId, 'config');
    if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
    }
    return tenantDir;
}

function getContactsFilePath(tenantId) {
    return path.join(getTenantDir(tenantId), 'contacts.json');
}

function getContacts(tenantId) {
    const filePath = getContactsFilePath(tenantId);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveContacts(tenantId, contacts) {
    const filePath = getContactsFilePath(tenantId);
    fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2), 'utf8');
    return contacts;
}

function addOrUpdateContact(tenantId, contactData) {
    const contacts = getContacts(tenantId);
    const phoneClean = (contactData.phone || '').replace(/[^0-9]/g, '');
    if (!phoneClean) {
        throw new Error('Nomor telepon wajib diisi');
    }

    const index = contacts.findIndex(c => c.phone === phoneClean);
    const now = new Date().toISOString();

    const contactObj = {
        id: index >= 0 ? contacts[index].id : 'cnt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: contactData.name || 'Tanpa Nama',
        phone: phoneClean,
        tags: Array.isArray(contactData.tags) ? contactData.tags : (contactData.tags ? contactData.tags.split(',').map(t => t.trim()) : ['Customer']),
        notes: contactData.notes || '',
        status: contactData.status || 'active', // active, unsubscribed, blocked
        isValidWA: contactData.isValidWA !== undefined ? contactData.isValidWA : true,
        createdAt: index >= 0 ? contacts[index].createdAt : now,
        updatedAt: now
    };

    if (index >= 0) {
        contacts[index] = { ...contacts[index], ...contactObj, updatedAt: now };
    } else {
        contacts.push(contactObj);
    }

    saveContacts(tenantId, contacts);
    return contactObj;
}

function deleteContact(tenantId, contactId) {
    const contacts = getContacts(tenantId);
    const filtered = contacts.filter(c => c.id !== contactId && c.phone !== contactId);
    saveContacts(tenantId, filtered);
    return { success: true, remaining: filtered.length };
}

function searchContacts(tenantId, { query, tag, status }) {
    let contacts = getContacts(tenantId);

    if (query) {
        const q = query.toLowerCase();
        contacts = contacts.filter(c => 
            c.name.toLowerCase().includes(q) || 
            c.phone.includes(q) || 
            (c.notes && c.notes.toLowerCase().includes(q))
        );
    }

    if (tag) {
        contacts = contacts.filter(c => c.tags && c.tags.includes(tag));
    }

    if (status) {
        contacts = contacts.filter(c => c.status === status);
    }

    return contacts;
}

// ============ CSV PARSER & EXPORTER ============

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const results = [];

    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('telepon') || h.includes('nomor') || h.includes('hp') || h.includes('wa'));
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nama'));
    const tagsIdx = headers.findIndex(h => h.includes('tag') || h.includes('label'));
    const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('catatan'));

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const phoneRaw = phoneIdx >= 0 ? cols[phoneIdx] : cols[0];
        const phoneClean = (phoneRaw || '').replace(/[^0-9]/g, '');

        if (phoneClean) {
            results.push({
                name: nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : 'Kontak CSV ' + i,
                phone: phoneClean,
                tags: tagsIdx >= 0 && cols[tagsIdx] ? cols[tagsIdx].split(';').map(t => t.trim()) : ['CSV Import'],
                notes: notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx] : ''
            });
        }
    }
    return results;
}

function importContactsFromCSV(tenantId, csvText) {
    const parsed = parseCSV(csvText);
    let addedCount = 0;
    let updatedCount = 0;

    parsed.forEach(item => {
        const existing = getContacts(tenantId).find(c => c.phone === item.phone);
        if (existing) updatedCount++; else addedCount++;
        addOrUpdateContact(tenantId, item);
    });

    return { totalParsed: parsed.length, addedCount, updatedCount };
}

function exportContactsToCSV(tenantId) {
    const contacts = getContacts(tenantId);
    let csv = 'Name,Phone,Tags,Notes,Status,Created\n';

    contacts.forEach(c => {
        const nameEsc = `"${(c.name || '').replace(/"/g, '""')}"`;
        const phone = c.phone;
        const tagsEsc = `"${(c.tags || []).join(';')}"`;
        const notesEsc = `"${(c.notes || '').replace(/"/g, '""')}"`;
        const status = c.status || 'active';
        const created = c.createdAt || '';

        csv += `${nameEsc},${phone},${tagsEsc},${notesEsc},${status},${created}\n`;
    });

    return csv;
}

module.exports = {
    getContacts,
    saveContacts,
    addOrUpdateContact,
    deleteContact,
    searchContacts,
    importContactsFromCSV,
    exportContactsToCSV
};
