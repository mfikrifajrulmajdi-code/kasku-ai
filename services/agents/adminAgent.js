const { generateInvoice } = require('../invoiceGenerator');

module.exports = {
  id: 'ADMIN',
  name: 'Iwan',
  description: 'Admin Agent',
  complexity: 'heavy',
  canHandleImage: false,
  requiredRole: 'OWNER',
  escalateTo: null,

  async handle(context) {
    const { sender, senderNumber, isOwner, messageText, history, imageData, katalog, faq, callLLM, callGasDatabase, learningSystem, aiConf } = context;
    
    const lessons = learningSystem.getLessons(this.id);
    const lessonText = lessons.length > 0 
      ? `\n\nPELAJARAN DARI PENGALAMAN (WAJIB DIPATUHI):\n${lessons.map(l => '- ' + l.lesson).join('\n')}` 
      : '';
    
    const agentName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.ADMIN)
        ? context.tenantConfig.agents.ADMIN.name : this.name;

    const systemPrompt = `Anda adalah "${agentName}", Asisten Eksekutif Pribadi (Virtual Assistant) untuk Sang Bos (Owner).
Karakter: Sangat loyal, super efisien, to-the-point, berwibawa.
SOP:
1. Panggil pengguna dengan sebutan "Siap, Bos" atau "Baik, Pak/Bu".
2. Kerjakan tugas analisis, pembuatan draft, atau pencarian informasi dengan format yang paling mudah dibaca oleh bos yang sibuk (Gunakan poin-poin tebal).
3. Jika Bos meminta "Rekap Hutang" atau "Siapa aja yang ngutang", Anda WAJIB membalas dengan JSON murni HANYA berisi: {"action": "REKAP_HUTANG"}
4. Jika Bos menyuruh membuat invoice/tagihan, Anda WAJIB membalas dengan JSON murni HANYA berisi: {"action": "BUAT_INVOICE", "nama": "Nama Klien/Perusahaan", "nominal": AngkaTotal, "keterangan": "Keterangan layanan/proyek"}${lessonText}`;

    const adminRes = await callLLM(systemPrompt, history, false);
    
    try {
        const adminJson = JSON.parse(adminRes);
        if (adminJson.action === "REKAP_HUTANG") {
            const dbRes = await callGasDatabase({ action: "REKAP_HUTANG_PIUTANG" });
            return `Siap, Bos! Ini rekapannya:\n\n${dbRes.rekap}`;
        } else if (adminJson.action === "BUAT_INVOICE") {
            const invoicePath = await generateInvoice({
                nama: adminJson.nama,
                nominal: adminJson.nominal,
                keterangan: adminJson.keterangan
            });
            return {
                type: "INVOICE_GENERATED",
                reply: `Siap, Bos! Invoice untuk *${adminJson.nama}* senilai Rp ${Number(adminJson.nominal).toLocaleString('id-ID')} sudah saya buatkan. Dokumen terlampir.`,
                filePath: invoicePath
            };
        }
    } catch(e) {
        // Bukan JSON, biarkan Asisten membalas teks biasa
    }
    return adminRes;
  }
};
