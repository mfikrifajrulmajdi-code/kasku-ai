'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Edit2, Play, Users } from 'lucide-react';

export default function SequencesPage() {
  const [steps, setSteps] = useState([
    { id: 1, delay: 0, message: 'Halo {name}, terima kasih sudah mendaftar!' },
    { id: 2, delay: 1, message: 'Apakah ada yang bisa kami bantu terkait layanan kami?' },
    { id: 3, delay: 3, message: 'Promo khusus untuk Anda hari ini, diskon 20%!' },
    { id: 4, delay: 7, message: 'Bagaimana pengalaman Anda sejauh ini?' },
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
            ⏳ Drip Campaign & Multi-Step Sequence Builder
          </h1>
          <p className="text-slate-400 mt-2">Buat rangkaian pesan otomatis yang dikirim berdasarkan jadwal</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Tambah Sequence Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Langkah-langkah Sequence</h2>
          <div className="relative border-l-2 border-slate-800 ml-4 space-y-8 pb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="relative pl-8">
                <div className="absolute -left-[17px] top-4 bg-slate-900 border-2 border-violet-500 rounded-full w-8 h-8 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-violet-400" />
                </div>
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-violet-500/50 transition-colors">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-3 text-slate-200">
                      Langkah {index + 1}
                      <Badge variant="secondary" className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                        {step.delay === 0 ? 'Langsung (H+0)' : `H+${step.delay} Hari`}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-400">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-slate-950 rounded-md border border-slate-800 text-slate-300">
                      {step.message}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
            
            <div className="relative pl-8 pt-4">
              <div className="absolute -left-[17px] top-8 bg-slate-900 border-2 border-dashed border-slate-700 rounded-full w-8 h-8 flex items-center justify-center">
                <Plus className="w-4 h-4 text-slate-500" />
              </div>
              <Button variant="outline" className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 py-8 bg-transparent">
                + Tambah Langkah Baru
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-slate-200">
                <Users className="w-5 h-5 text-indigo-400" />
                Manual Enrollment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nama Kontak</label>
                <Input placeholder="John Doe" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nomor WhatsApp</label>
                <Input placeholder="6281234567890" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Pilih Sequence</label>
                <select className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  <option value="welcome">Welcome Onboarding</option>
                  <option value="followup">Follow up Prospek</option>
                  <option value="abandoned">Abandoned Cart</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => {
                fetch('/api/sequences', { method: 'POST' });
              }}>
                <Play className="w-4 h-4" /> Masukkan ke Sequence
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
