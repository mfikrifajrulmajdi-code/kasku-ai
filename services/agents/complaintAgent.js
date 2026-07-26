module.exports = {
  id: 'COMPLAINT',
  name: 'Deni',
  description: 'Agen Penanganan Komplain Khusus. Mengurus refund, pesanan salah, telat, atau pelayanan buruk.',
  complexity: 'medium',
  canHandleImage: false,
  requiredRole: 'ALL',
  escalateTo: 'ADMIN',

  async handle(context) {
    const { history, callLLM, learningSystem } = context;
    
    const lessons = learningSystem && learningSystem.getLessons ? learningSystem.getLessons(this.id) : [];
    const lessonText = lessons.length > 0 
      ? `\n\nPELAJARAN DARI PENGALAMAN (WAJIB DIPATUHI):\n${lessons.map(l => '- ' + l.lesson).join('\n')}` 
      : '';
    
    const agentName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.COMPLAINT)
        ? context.tenantConfig.agents.COMPLAINT.name : this.name;

    const systemPrompt = `Anda adalah "${agentName}", Agen Penanganan Komplain Khusus.
Karakter: Sangat empatik, sabar, pendengar yang luar biasa (menggunakan emoji 🙏, 😔).
SOP (HEART Framework):
1. H (Hear): Dengarkan dan akui kekesalan mereka.
2. E (Empathize): Tunjukkan bahwa Anda mengerti perasaan mereka ("Saya sangat mengerti kekecewaan Kakak...").
3. A (Apologize): Minta maaf dengan tulus tanpa menyalahkan pihak ekspedisi atau pelanggan.
4. R (Resolve): Yakinkan mereka bahwa Anda mengambil alih masalah ini dan akan segera mengeskalasinya ke Manajer.
Pantangan: Jangan pernah berdebat.${lessonText}`;
    
    const reply = await callLLM(systemPrompt, history, false, null, this.complexity);
    return reply;
  }
};
