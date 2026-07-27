// ============================================================================
// GROUP AUTOMATION SERVICE — Group Greeter & Group Member Extractor
// Sambut anggota baru di grup WA & Ekspor daftar anggota grup ke CSV
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

function getGroupConfigPath(tenantId) {
    return path.join(getTenantDir(tenantId), 'group_config.json');
}

function getGroupConfig(tenantId = 'default') {
    const filePath = getGroupConfigPath(tenantId);
    if (!fs.existsSync(filePath)) {
        return {
            autoWelcome: true,
            welcomeTemplate: 'Selamat datang Kak {member_name} di grup {group_name}! 👋😊 Semoga betah yaa!',
            groups: []
        };
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return { autoWelcome: true, welcomeTemplate: 'Selamat datang Kak {member_name}!', groups: [] };
    }
}

function saveGroupConfig(tenantId, configData) {
    const filePath = getGroupConfigPath(tenantId);
    fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
    return configData;
}

/**
 * Event Listener saat anggota baru bergabung ke grup WA
 */
async function handleGroupParticipantsUpdate(sock, update, tenantId = 'default') {
    const { id: groupJid, participants, action } = update;
    if (action !== 'add' || !participants || participants.length === 0) return;

    const config = getGroupConfig(tenantId);
    if (!config.autoWelcome) return;

    try {
        const metadata = await sock.groupMetadata(groupJid);
        const groupName = metadata.subject || 'Grup';

        for (const participantJid of participants) {
            const memberPhone = participantJid.split('@')[0];
            const memberName = '@' + memberPhone;

            let text = config.welcomeTemplate || 'Selamat datang Kak {member_name} di {group_name}!';
            text = text.replace(/\{member_name\}/gi, memberName).replace(/\{group_name\}/gi, groupName);

            await sock.sendMessage(groupJid, {
                text,
                mentions: [participantJid]
            });
        }
    } catch (err) {
        console.error('[GROUP-GREETER] Error:', err.message);
    }
}

/**
 * Mengekstrak seluruh nomor anggota dari grup WA dan menghasilkan format CSV
 */
async function extractGroupMembersToCSV(sock, groupJid) {
    if (!sock) throw new Error('WhatsApp Service belum terhubung');

    const metadata = await sock.groupMetadata(groupJid);
    const groupName = metadata.subject || 'Grup';
    const participants = metadata.participants || [];

    let csv = 'Phone,Role,Group\n';
    participants.forEach(p => {
        const phone = p.id.split('@')[0];
        const role = p.admin || 'member';
        csv += `"${phone}","${role}","${groupName.replace(/"/g, '""')}"\n`;
    });

    return {
        groupName,
        totalMembers: participants.length,
        csv
    };
}

module.exports = {
    getGroupConfig,
    saveGroupConfig,
    handleGroupParticipantsUpdate,
    extractGroupMembersToCSV
};
