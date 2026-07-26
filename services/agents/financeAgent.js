const analyticsService = require('../analyticsService');

module.exports = {
  id: 'FINANCE',
  name: 'Hadi',
  description: 'Finance Agent',
  complexity: 'heavy',
  canHandleImage: true,
  requiredRole: 'OWNER',
  escalateTo: null,

  async handle(context) {
    const { sender, senderNumber, isOwner, messageText, history, imageData, katalog, faq, callLLM, callGasDatabase, learningSystem, aiConf } = context;
    
    // Cek jika Owner meminta laporan performa/omset toko
    const textLower = messageText.toLowerCase();
    if (textLower.includes('laporan omset') || textLower.includes('performa toko') || textLower.includes('ringkasan omset') || textLower.includes('omset harian') || textLower.includes('laporan performa')) {
        return analyticsService.getStorePerformanceMetrics();
    }

    
    const lessons = learningSystem.getLessons(this.id);
    const lessonText = lessons.length > 0 
      ? `\n\nPELAJARAN DARI PENGALAMAN (WAJIB DIPATUHI):\n${lessons.map(l => '- ' + l.lesson).join('\n')}` 
      : '';
    
    const agentName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.FINANCE)
        ? context.tenantConfig.agents.FINANCE.name : this.name;

    const systemPrompt = `Anda adalah "${agentName}", Sistem Akuntan Otomatis (Finance Extractor).
SOP:
1. Analisis pesan dari Owner dan ekstrak data transaksi keuangan.
2. Jika ada perubahan pikiran dalam satu kalimat (misal "Beli A 50rb eh ralat jadinya 30rb"), gunakan angka final (30rb).
3. STANDARISASI KATEGORI (Chart of Accounts): Anda WAJIB memetakan nama pengeluaran/pemasukan ke dalam SALAH SATU dari kategori baku di bawah ini. JANGAN menggunakan kata lain di luar daftar ini untuk nilai 'cat'.
Daftar Pemasukan (Masuk):
- Penjualan Produk/Barang
- Pendapatan Jasa/Layanan
- Pendapatan Komisi/Afiliasi
- Gaji & Bonus
- Hasil Investasi / Bunga
- Pendapatan Lain-Lain
Daftar Pengeluaran (Keluar):
- Pembelian Stok/Bahan Baku (HPP)
- Biaya Kemasan/Packaging
- Biaya Pengiriman & Logistik
- Konsumsi (F&B)
- Transportasi & Kendaraan
- Beban Operasional Umum
- Sewa Tempat/Bangunan
- Beban Pemasaran & Iklan
- Beban Perlengkapan (ATK)
- Beban Gaji, Upah & Komisi
- Biaya Maintenance & Perbaikan
- Biaya Pajak & Legalitas
- Biaya Software & Langganan
- Pengeluaran Pribadi / Prive
- Sedekah / Donasi
- Pengeluaran Lain-Lain

Output HARUS format JSON murni:
{"data":[{"cat":"Kategori Pengeluaran/Pemasukan (string, WAJIB dari daftar CoA di atas)","amt":Nominal Angka Murni (number),"type":"Masuk|Keluar","rek":"Nama Rekening (string, default: Cash)"}], "hutang_piutang": [{"jenis": "Piutang|Terima Cicilan|Hutang|Bayar Hutang", "pihak": "Nama Orang/Toko", "amt": Nominal Angka, "rek": "BCA/Cash", "ket": "Keterangan"}], "is_undo": false}

PENTING UNTUK HUTANG PIUTANG:
Jika transaksi adalah Kasbon, Pinjaman, atau Cicilan, JANGAN masukkan ke "data", TAPI masukkan ke "hutang_piutang".
- Piutang: Kita meminjamkan uang/barang ke orang lain.
- Terima Cicilan: Orang membayar utang ke kita.
- Hutang: Kita meminjam uang/barang dari orang lain.
- Bayar Hutang: Kita membayar utang kita ke orang lain.

PENTING UNTUK PEMBATALAN: Jika pengguna bermaksud MEMBATALKAN atau MENGHAPUS transaksi sebelumnya, cukup keluarkan JSON: {"is_undo": true}. Abaikan data lainnya.

PENTING UNTUK GAMBAR (REKONSILIASI MASSAL): 
- Jika itu 1 gambar struk transfer, baca Nominal, set 'cat' jadi "Transfer/Pembayaran", dan 'rek' sesuai "Bank Tujuan".
- JIKA GAMBAR ADALAH SCREENSHOT MUTASI REKENING (Bank Statement) yang berisi BANYAK BARIS TRANSAKSI: Anda WAJIB membaca seluruh baris yang terlihat, dan memasukkan SETIAP baris tersebut ke dalam array "data". Jangan sampai ada yang terlewat! Tentukan 'type' (Masuk/Keluar) berdasarkan posisi angka (Kredit/Debit) di mutasi tersebut, dan cocokkan kategorinya ke daftar CoA secara logis.${lessonText}`;

    const finResStr = await callLLM(systemPrompt, history, true, imageData);
    let finData = { data: [] };
    try { 
        let cleanStr = finResStr.replace(/```json/g, "").replace(/```/g, "").trim();
        finData = JSON.parse(cleanStr); 
    } catch(e){
        console.error("[FINANCE] Gagal parse JSON:", e.message);
    }
    
    let reply = "";
    if (finData.is_undo) {
        const dbRes = await callGasDatabase({ action: "HAPUS_TERAKHIR" });
        if (dbRes && dbRes.status === "success") {
            reply = `🗑️ *Pembatalan Berhasil*\n${dbRes.message}\n\n✅ Dieksekusi oleh ${agentName}.`;
        } else {
            reply = `⚠️ ${agentName} gagal membatalkan transaksi: ${dbRes ? dbRes.message : "Tidak ada respon server."}`;
        }
    } else if ((finData.data && finData.data.length > 0) || (finData.hutang_piutang && finData.hutang_piutang.length > 0)) {
        
        let hasWarning = false;
        let warningMessage = "";
        if (finData.data) {
            for (let ai of finData.data) {
                if (ai.cat === "Konsumsi (F&B)" && ai.amt >= 500000 && !messageText.toLowerCase().includes("tetap catat")) {
                    hasWarning = true;
                    warningMessage = `⚠️ *Peringatan Budget (Penjaga Anggaran)!*\n\nBos, pengeluaran untuk *${ai.cat}* senilai Rp ${ai.amt.toLocaleString('id-ID')} terdeteksi. Ini melebihi batas wajar harian Anda!\n\nJika Anda yakin ingin tetap mencatatnya, mohon balas ulang pesan Anda dengan tambahan kata: *"Tetap catat"*.`;
                    break;
                }
            }
        }

        if (hasWarning) {
            return warningMessage;
        }
        
        let balasan = "📝 *Transaksi Tercatat*\n━━━━━━━━━━━━━━━━━━\n";
        
        if (finData.data) {
            for (let ai of finData.data) {
                await callGasDatabase({
                    action: "CATAT_TRANSAKSI",
                    from: sender, pesan: messageText, ai: ai
                });
                balasan += `• [${ai.rek || "Cash"}] ${ai.cat}: Rp ${ai.amt} (${ai.type === "Masuk"?"📈":"📉"})\n`;
            }
        }
        
        if (finData.hutang_piutang) {
            for (let ai of finData.hutang_piutang) {
                await callGasDatabase({
                    action: "CATAT_HUTANG_PIUTANG",
                    from: sender, pesan: messageText, ai: ai
                });
                let ikon = (ai.jenis === "Piutang" || ai.jenis === "Bayar Hutang") ? "📉" : "📈";
                balasan += `• 📒 [${ai.jenis}] ${ai.pihak} - Rp ${ai.amt} ${ikon}\n`;
            }
        }
        
        balasan += "━━━━━━━━━━━━━━━━━━\n✅ Data diamankan oleh " + agentName + ".";
        reply = balasan;
    } else {
        reply = "⚠️ " + agentName + " gagal mendeteksi nominal transaksi yang valid.";
    }

    return reply;
  }
};
