'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Key, Webhook, Link2, Plus, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function DeveloperPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateApiKey = () => {
    fetch('/api/developer/generate-key', { method: 'POST' });
    alert('API Key baru berhasil di-generate!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
          🔑 Developer API Portal & Webhook Field Mapper
        </h1>
        <p className="text-slate-400 mt-2">Kelola akses API dan integrasi sistem eksternal dengan mudah</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2 text-slate-200">
                <Key className="w-5 h-5 text-emerald-400" />
                API Keys
              </CardTitle>
              <CardDescription className="text-slate-400">Kelola token akses API Anda</CardDescription>
            </div>
            <Button onClick={generateApiKey} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Generate Key
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-950">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300">Nama Key</TableHead>
                    <TableHead className="text-slate-300">Token</TableHead>
                    <TableHead className="text-slate-300">Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-slate-800 hover:bg-slate-800/30">
                    <TableCell className="font-medium text-slate-200">Production Key</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-emerald-400 text-xs font-mono">
                          zk_live_9f8e7d...
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => copyToClipboard('zk_live_9f8e7d1234567890', 'key1')}>
                          {copied === 'key1' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">24 Jul 2026</TableCell>
                  </TableRow>
                  <TableRow className="border-slate-800 hover:bg-slate-800/30">
                    <TableCell className="font-medium text-slate-200">Development Key</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-slate-400 text-xs font-mono">
                          zk_test_1a2b3c...
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => copyToClipboard('zk_test_1a2b3c0987654321', 'key2')}>
                          {copied === 'key2' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">26 Jul 2026</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-slate-200">
              <Webhook className="w-5 h-5 text-cyan-400" />
              Visual Webhook Mapper
            </CardTitle>
            <CardDescription className="text-slate-400">Peta field dari webhook eksternal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400">Google Forms</Badge>
              <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-400">WooCommerce</Badge>
              <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-400">Elementor</Badge>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300">Mapping Rules Active (Google Forms)</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="flex-1 font-mono text-sm text-cyan-400">entry.123456 (Nama)</div>
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <div className="flex-1 font-mono text-sm text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-center border border-emerald-500/20">{`{name}`}</div>
                </div>
                <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="flex-1 font-mono text-sm text-cyan-400">entry.987654 (WhatsApp)</div>
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <div className="flex-1 font-mono text-sm text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-center border border-emerald-500/20">{`{phone}`}</div>
                </div>
                <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="flex-1 font-mono text-sm text-cyan-400">entry.112233 (Email)</div>
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <div className="flex-1 font-mono text-sm text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-center border border-emerald-500/20">{`{email}`}</div>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800/50 bg-transparent">
              + Tambah Mapping Rule
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
