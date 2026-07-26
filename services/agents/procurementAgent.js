module.exports = {
  id: 'PROCUREMENT',
  name: 'Joko',
  description: 'Procurement Agent',
  complexity: 'heavy',
  canHandleImage: true,
  requiredRole: 'ALL',
  escalateTo: null,

  async handle(context) {
    const { sender, senderNumber, isOwner, messageText, history, imageData, katalog, faq, callLLM, callGasDatabase, learningSystem, aiConf } = context;
    
    const lessons = learningSystem.getLessons(this.id);
    const lessonText = lessons.length > 0 
      ? `\n\nPELAJARAN DARI PENGALAMAN (WAJIB DIPATUHI):\n${lessons.map(l => '- ' + l.lesson).join('\n')}` 
      : '';
    
    const agentName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.PROCUREMENT)
        ? context.tenantConfig.agents.PROCUREMENT.name : this.name;

    const systemPrompt = `Anda adalah "${agentName}", Agen Procurement (Kepala Gudang & Pembelian).
Karakter: Profesional, cerdik, tegas ke vendor tapi sangat patuh ke Bos (Owner).
SOP (Sistem Lintas Agen):
1. Jika Bos menyuruh Anda menanyakan barang ke Vendor (misal: "Tanyain sepatu merah ada gak"), Anda WAJIB membalas dengan format JSON murni agar sistem bisa meneruskannya (Cross-Chat) ke Nomor Vendor.
   Format JSON: {"action": "CHAT_VENDOR", "pesan": "Isi pesan untuk vendor", "target": "VENDOR_A"}
2. Jika Bos belum menyebutkan Vendor yang spesifik, tanya balik ke Bos secara natural (tanpa JSON).
3. Jika Supplier/Vendor yang menghubungi Anda (misal menawarkan barang atau menjawab pertanyaan stok), Anda WAJIB melaporkan pesan tersebut ke Bos menggunakan format JSON murni berikut:
   Format JSON: {"action": "LAPOR_BOS", "pesan": "Isi laporan untuk bos yang jelas dan sopan"}
Jangan pernah menggunakan JSON jika hanya sedang ngobrol biasa dengan Bos atau Vendor tanpa perlu aksi sistem.${lessonText}`;

    const jokoRes = await callLLM(systemPrompt, history, false);
    
    try {
        let cleanStr = jokoRes.replace(/```json/g, "").replace(/```/g, "").trim();
        const jokoData = JSON.parse(cleanStr);
        if (jokoData.action === "CHAT_VENDOR") {
            return {
                type: "CROSS_CHAT",
                target: jokoData.target,
                pesan: jokoData.pesan,
                replyToSender: `Siapp Bos! Pesan udah ${agentName} terusin ke ${jokoData.target} ya. Tinggal nunggu balesan.`
            };
        } else if (jokoData.action === "LAPOR_BOS") {
            return {
                type: "CROSS_CHAT",
                target: aiConf.ownerPhone,
                pesan: `*[Laporan ${agentName}]*:\n${jokoData.pesan}`,
                replyToSender: `Siap, pesan sudah ${agentName} laporkan ke Bos!`
            };
        }
    } catch(e) {
        // Jika bukan JSON, berarti obrolan biasa
    }
    return jokoRes;
  }
};
