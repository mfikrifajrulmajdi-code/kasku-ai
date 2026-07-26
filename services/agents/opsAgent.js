const orderStore = require('../orderStore');
const midtrans = require('../midtransService');
const ongkirService = require('../ongkirService');
const stockStore = require('../stockStore');

module.exports = {
  id: 'OPS',
  name: 'Citra',
  description: 'Kasir & Admin Operasional. Mengurus pesanan (checkout), konfirmasi ukuran, validasi alamat lengkap, dan penerbitan invoice.',
  complexity: 'heavy',
  canHandleImage: false,
  requiredRole: 'ALL',
  escalateTo: null,

  async handle(context) {
    const { history, katalog, callLLM, callGasDatabase, learningSystem, senderNumber, messageText, sender } = context;

    const lessons = learningSystem && learningSystem.getLessons ? learningSystem.getLessons(this.id) : [];
    const lessonText = lessons.length > 0 
      ? `\n\nPELAJARAN DARI PENGALAMAN (WAJIB DIPATUHI):\n${lessons.map(l => '- ' + l.lesson).join('\n')}` 
      : '';
    
    const agentName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.OPS)
        ? context.tenantConfig.agents.OPS.name : this.name;
    const storeName = (context.tenantConfig && context.tenantConfig.companyName) || 'KasKu Store';
    const salesName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.SALES)
        ? context.tenantConfig.agents.SALES.name : 'Bima';
    const procurementName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.PROCUREMENT)
        ? context.tenantConfig.agents.PROCUREMENT.name : 'Joko';

    const systemPrompt = `Anda adalah "${agentName}", Kasir & Admin Operasional ${storeName} yang sangat teliti & bersahabat.
Karakter: Sangat ramah, teliti, menganggap ${salesName} (Sales) sebagai rekan kerjanya. JANGAN kaku/robotik. Gunakan emoji 😊, 🙏, 📦.
[KATALOG]: ${katalog}.

SOP CHECKOUT TERSTRUKTUR (SANGAT STRICT / WAJIB DIPATUHI):
1. TAHAP 1 (KONFIRMASI BARANG & UKURAN): Jika pelanggan belum menyebutkan UKURAN (misal: 39, 40, 41, 42) atau JUMLAH pesanan:
   Jangan pernah buatkan invoice! Balas dengan menanyakan ukuran & jumlah yang diinginkan.
   Contoh: "Halo Kak! Aku ${agentName} bagian kasir 😊 ${salesName} barusan nitipin data pesanan Kakak nih. Boleh diinfokan dulu ukuran sepatunya (misal: 40, 41, 42) dan mau berapa pasang Kak?"

2. TAHAP 2 (VALIDASI ALAMAT LENGKAP EKSPEDISI): Jika ukuran sudah ada tetapi ALAMAT belum lengkap (hanya sebut nama kota seperti "Jakarta", "Tasik alaya", "Bandung" tanpa nama jalan, RT/RW, atau kecamatan):
   Jangan pernah buatkan invoice! Minta alamat lengkap sesuai standar ekspedisi (J&T/JNE).
   Contoh: "Siap Kak! Untuk pengiriman via ekspedisi, ${agentName} butuh alamat lengkap Kakak nih biar paketnya tidak nyasar dan ongkirnya pas. Boleh diisikan format berikut Kak?
   • Nama Penerima:
   • Jalan / RT RW / No. Rumah:
   • Kecamatan & Kota:
   • No. HP Aktif:"

3. PENANGNANAN STRUK HILANG / BUKTI BAYAR: Jika pelanggan mengaku sudah transfer tapi struknya hilang / tidak ada bukti:
   JANGAN LANGSUNG PROSES! Minta detail mutasi: "Siap Kak! Jika struk hilang, boleh infokan nama rekening pengirim dan jam transfernya Kak? Biar ${agentName} bantu cek mutasi rekening ${storeName} secara manual 🙏"

4. PENANGGANAN KURIR INSTANT (GOSEND/GRAB): Jika pelanggan minta GoSend/GrabExpress/Instant:
   Balas: "Bisa banget Kak! Untuk wilayah Tasikmalaya dan sekitarnya, kami melayani pengiriman GoSend/GrabExpress Instant dari jam 08.00 - 17.00 WIB 🚀"

5. TAHAP 3 (INVOICE & LINK BAYAR): JIKA DAN HANYA JIKA UKURAN, JUMLAH, DAN ALAMAT LENGKAP SUDAH PASTI & VALID:
   Hitung total barang + ongkir real-time, sebutkan rinciannya dengan jelas, dan terbitkan ID Pesanan.
   Set "is_ready_for_invoice": true dalam output JSON!


Output HANYA format JSON murni:
{
  "sku_ditemukan": "SKU_PRODUK",
  "ukuran": "UKURAN_JIKA_ADA",
  "jumlah": angka_jumlah,
  "alamat_lengkap": "ALAMAT_LENGKAP_JIKA_VALID",
  "kota_tujuan": "NAMA_KOTA_TUJUAN",
  "is_ready_for_invoice": true_atau_false,
  "reply": "Kalimat balasan Citra (Bahasa Indonesia yang sangat ramah & teliti)"
}${lessonText}`;

    // Cek jika pelanggan meminta rekap total seluruh pesanan
    if (orderStore && (senderNumber || sender)) {
      try {
        const textLower = messageText.toLowerCase();
        const targetNum = senderNumber || sender;
        if (textLower.includes('total pesanan') || textLower.includes('rekap pesanan') || textLower.includes('semua pesanan') || textLower.includes('pesanan saya apa')) {
          const summary = orderStore.getOrdersSummary(targetNum);
          if (summary) {
            console.log(`[OPS] 📋 Mengembalikan rekap total pesanan untuk ${targetNum}`);
            return summary;
          }
        }

        // Cek apakah pelanggan ini sudah punya pesanan LUNAS via Midtrans/System
        const allOrders = orderStore.loadOrders();
        const paidOrder = Object.values(allOrders).find(o => 
          (o.senderNumber === targetNum || o.senderNumber === senderNumber || o.senderNumber === sender) && 
          o.status === 'LUNAS'
        );
        
        if (paidOrder && (textLower.includes('bayar') || textLower.includes('transfer') || textLower.includes('tf') || textLower.includes('lunas') || textLower.includes('sama'))) {
          const displayOrderId = paidOrder.orderId.replace('#', '');
          console.log(`[OPS] 💡 Pesanan ${displayOrderId} milik ${targetNum} sudah LUNAS, mengembalikan konfirmasi otomatis.`);
          return `Wah pesanan Kakak dengan ID *#${displayOrderId}* sudah terverifikasi *LUNAS* secara otomatis via Midtrans! 📦✨\n\n${agentName} & ${procurementName} (Gudang) sedang mengemas paket Kakak untuk dikirim hari ini. Terima kasih banyak telah berbelanja di ${storeName}! 🙏😊`;
        }
      } catch(e) {
        console.error('[OPS] Error checking order summary:', e.message);
      }
    }

    const opsResStr = await callLLM(systemPrompt, history, true, null, this.complexity);
    console.log("[OPS] Raw Output:", opsResStr);
    
    let opsData = {};
    try { 
      let cleanStr = opsResStr.replace(/```json/g, "").replace(/```/g, "").trim();
      opsData = JSON.parse(cleanStr); 
    } catch(e) {
      console.error("[OPS] Gagal parse JSON:", e.message);
    }
    
    let reply = opsData.reply || "Maaf Kak, format pesanan belum terbaca jelas. Boleh diulangi?";
    
    // PERBAIKAN VITAL: Hanya buat Invoice jika is_ready_for_invoice === true
    if (opsData.is_ready_for_invoice && opsData.sku_ditemukan && opsData.sku_ditemukan !== "SKU_JIKA_ADA" && opsData.sku_ditemukan !== "null") {
      
      const qty = opsData.jumlah || 1;
      const sku = opsData.sku_ditemukan;

      // Cek Ongkir Real-Time
      const kotaTujuan = opsData.kota_tujuan || "Jakarta";
      const ongkirInfo = ongkirService.calculateOngkir(kotaTujuan, 1000, 'J&T');
      const hargaBarang = 250000;
      const totalHargaBarang = hargaBarang * qty;
      const grandTotal = totalHargaBarang + ongkirInfo.totalOngkir;

      // Potong Stok Real-Time
      stockStore.deductStock(sku, qty);

      if (callGasDatabase) {
        await callGasDatabase({ action: "KURANGI_STOK", sku, jumlah: qty });
      }

      // Terbitkan Order ID & Midtrans Snap Link
      if (orderStore && senderNumber) {
        const newOrder = orderStore.createOrder(senderNumber, [{ sku, qty, size: opsData.ukuran || '-' }], grandTotal, opsData.alamat_lengkap || kotaTujuan);
        if (newOrder && !reply.includes('#KASKU-')) {
          reply += `\n\n🧾 *INVOICE PEMBAYARAN ${storeName.toUpperCase()}*\n───────────────────────\n`;
          reply += `📦 Barang: 1x Sepatu SKU-${sku} (Uk: ${opsData.ukuran || '-'})\n`;
          reply += `💰 Subtotal Barang: Rp ${totalHargaBarang.toLocaleString('id-ID')}\n`;
          reply += `🚚 Ongkir (${ongkirInfo.courier} ➔ ${kotaTujuan}): ${ongkirInfo.formattedOngkir}\n`;
          reply += `───────────────────────\n`;
          reply += `💰 *TOTAL BAYAR: Rp ${grandTotal.toLocaleString('id-ID')}*\n\n`;
          reply += `📌 *ID Pesanan:* \`${newOrder.orderId}\``;
          
          // Buat Midtrans Payment Link
          try {
            const snapRes = await midtrans.createSnapTransaction(newOrder.orderId, grandTotal, "Pelanggan", senderNumber);
            if (snapRes.success && snapRes.redirectUrl) {
              reply += `\n💳 *Link Bayar Otomatis (QRIS/GoPay/ShopeePay/VA):*\n${snapRes.redirectUrl}`;
            }
          } catch(e) {}
          
          reply += `\n\n_Ketik \`${newOrder.orderId}\` kapan saja di WA untuk cek status pengiriman live!_`;
        }
      }
    }
    
    return reply;
  }
};
