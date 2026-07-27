// ============================================================================
// NUMBER VALIDATOR SERVICE — Batch WA Number Checker
// Mengecek apakah daftar nomor telepon terdaftar di WhatsApp
// ============================================================================

const whatsappService = require('./whatsappService');
const contactStore = require('./contactStore');

/**
 * Validasi batch daftar nomor telepon menggunakan socket WhatsApp
 * @param {string[]} phones Array nomor telepon
 * @param {string} tenantId Tenant ID untuk update status di store (opsional)
 */
async function validatePhoneNumbers(phones, tenantId = null) {
    const sock = whatsappService.getSock ? whatsappService.getSock() : null;
    if (!sock) {
        throw new Error('WhatsApp Service belum terhubung. Silakan scan QR terlebih dahulu.');
    }

    const results = [];
    const uniquePhones = [...new Set(phones.map(p => p.replace(/[^0-9]/g, '')))].filter(Boolean);

    for (const phone of uniquePhones) {
        try {
            const jid = phone + '@s.whatsapp.net';
            const [onWa] = await sock.onWhatsApp(jid);

            const item = {
                phone,
                exists: !!(onWa && onWa.exists),
                jid: onWa ? onWa.jid : null
            };
            results.push(item);

            // Update status di contact store jika tenantId dispesifikasikan
            if (tenantId) {
                const contacts = contactStore.getContacts(tenantId);
                const contact = contacts.find(c => c.phone === phone);
                if (contact) {
                    contactStore.addOrUpdateContact(tenantId, {
                        ...contact,
                        isValidWA: item.exists
                    });
                }
            }

            // Delay kecil 200ms per check untuk menghindari rate-limit Meta
            await new Promise(res => setTimeout(res, 200));
        } catch (err) {
            results.push({
                phone,
                exists: false,
                error: err.message
            });
        }
    }

    const validCount = results.filter(r => r.exists).length;
    const invalidCount = results.filter(r => !r.exists).length;

    return {
        totalChecked: results.length,
        validCount,
        invalidCount,
        details: results
    };
}

module.exports = {
    validatePhoneNumbers
};
