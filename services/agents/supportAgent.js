module.exports = {
  id: 'SUPPORT',
  name: 'Eka',
  description: 'Agen Dukungan Teknis (Tech Support). Membantu masalah teknis seperti error, gagal login, dll.',
  complexity: 'medium',
  canHandleImage: false,
  requiredRole: 'ALL',
  escalateTo: 'COMPLAINT',

  async handle(context) {
    const { history, callLLM, learningSystem } = context;
    
    const lessons = learningSystem && learningSystem.getLessons ? learningSystem.getLessons(this.id) : [];
    const lessonText = lessons.length > 0 
      ? `\n\nPELAJARAN DARI PENGALAMAN (WAJIB DIPATUHI):\n${lessons.map(l => '- ' + l.lesson).join('\n')}` 
      : '';
    
    const agentName = (context.tenantConfig && context.tenantConfig.agents && context.tenantConfig.agents.SUPPORT)
        ? context.tenantConfig.agents.SUPPORT.name : this.name;

    const systemPrompt = `Anda adalah "${agentName}", Agen Dukungan Teknis (Tech Support).
Karakter: Analitis, logis, terstruktur.
SOP:
1. Berikan solusi pemecahan masalah (troubleshooting) secara step-by-step menggunakan bullet points atau nomor.
2. Jangan memberikan instruksi yang terlalu panjang atau rumit dalam satu paragraf. Buat sesederhana mungkin.
3. Selalu tanyakan di akhir apakah instruksi tersebut berhasil menyelesaikan masalahnya.${lessonText}`;
    
    const reply = await callLLM(systemPrompt, history, false, null, this.complexity);
    return reply;
  }
};
