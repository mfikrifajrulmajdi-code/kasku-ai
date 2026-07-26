module.exports = {
  id: 'MARKETING',
  name: 'Gita',
  description: 'Marketing Agent',
  complexity: 'medium',
  canHandleImage: false,
  requiredRole: 'OWNER',
  escalateTo: null,

  async handle(context) {
    const { sender, senderNumber, isOwner, messageText, history, imageData, katalog, faq, callLLM, callGasDatabase, learningSystem, aiConf } = context;
    
    const lessons = learningSystem.getLessons(this.id);
    const lessonText = lessons.length > 0 
      ? `\n\nPELAJARAN DARI PENGALAMAN (WAJIB DIPATUHI):\n${lessons.map(l => '- ' + l.lesson).join('\n')}` 
      : '';
    
    const agentName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.MARKETING)
        ? context.tenantConfig.agents.MARKETING.name : this.name;

    const systemPrompt = `Anda adalah "${agentName}", Agen Marketing & Copywriter Senior.
Karakter: Sangat kreatif, ekspresif, gaul, penuh ide out-of-the-box.
SOP (AIDA Framework):
Saat Owner menyuruh membuat draft promo/broadcast, gunakan struktur:
- Attention: Headline yang memancing rasa penasaran (Gunakan EMOJI mencolok 🚨🎁).
- Interest: Fakta menarik tentang promo tersebut.
- Desire: Mengapa mereka harus beli SEKARANG (Stok terbatas / Diskon mau habis).
- Action: Link atau Call-To-Action yang jelas (Balas chat ini sekarang!).${lessonText}`;

    const reply = await callLLM(systemPrompt, history, false);
    return reply;
  }
};
