"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Image as ImageIcon, Wand2, Play, Pause, RotateCcw, Check, CheckCheck, XCircle } from "lucide-react";

export default function BroadcastPage() {
  const [template, setTemplate] = useState("{Halo|Hai|Selamat Pagi} {nama}, promo {20%|spesial} hari ini!");
  const [previews, setPreviews] = useState<string[]>([]);

  const appendToTemplate = (tag: string) => {
    setTemplate(prev => prev + tag);
  };

  const generatePreviews = () => {
    // Dummy preview generator
    const samples = [
      "Halo Budi, promo 20% hari ini!",
      "Hai Siti, promo spesial hari ini!",
      "Selamat Pagi Andi, promo spesial hari ini!"
    ];
    setPreviews(samples);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          📢 Advanced Broadcast Studio
        </h1>
        <p className="text-muted-foreground">
          Kirim pesan massal dengan fitur Anti-Ban & Spintax terintegrasi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Composer */}
        <div className="space-y-6">
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle>1. Pilih Penerima</CardTitle>
              <CardDescription>Targetkan audiens berdasarkan tag.</CardDescription>
            </CardHeader>
            <CardContent>
              <select className="w-full h-10 rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20">
                <option value="all">Semua Kontak (Total: 1,204)</option>
                <option value="vip">Tag: VIP (Total: 45)</option>
                <option value="lead">Tag: Lead (Total: 312)</option>
                <option value="customer">Tag: Customer (Total: 840)</option>
              </select>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle>2. Komposer Pesan (Spintax)</CardTitle>
              <CardDescription>Gunakan sintaks <code>{'{opsi1|opsi2}'}</code> untuk variasi pesan guna menghindari ban.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10" onClick={() => appendToTemplate('{nama}')}>{'{nama}'}</Button>
                <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10" onClick={() => appendToTemplate('{phone}')}>{'{phone}'}</Button>
                <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10" onClick={() => appendToTemplate('{Halo|Hai}')}>{'{Halo|Hai}'}</Button>
                <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10" onClick={() => appendToTemplate('{terima kasih|nuhun}')}>{'{terima kasih|nuhun}'}</Button>
              </div>
              
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="min-h-[150px] w-full rounded-md border border-white/10 bg-black/50 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-mono"
                placeholder="Ketik pesan Anda di sini..."
              />

              <div className="space-y-2">
                <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10" onClick={generatePreviews}>
                  <Wand2 className="mr-2 h-4 w-4 text-purple-400" />
                  Preview Spintax (Live Sample)
                </Button>
                {previews.length > 0 && (
                  <div className="p-4 rounded-md bg-white/5 border border-white/10 space-y-2 text-sm text-muted-foreground">
                    <p className="font-semibold text-white/80 text-xs uppercase tracking-wider mb-2">Hasil Preview:</p>
                    {previews.map((p, i) => (
                      <div key={i} className="pl-3 border-l-2 border-purple-500/50">{p}</div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle>3. Pengaturan Anti-Ban & Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delay Min (detik)</Label>
                  <Input type="number" defaultValue={5} className="bg-black/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Delay Max (detik)</Label>
                  <Input type="number" defaultValue={15} className="bg-black/50 border-white/10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Media URL (Opsional)</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="https://example.com/image.jpg" className="pl-9 bg-black/50 border-white/10" />
                </div>
              </div>

              <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all">
                <Send className="mr-2 h-4 w-4" />
                Mulai Broadcast Massal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status & Logs */}
        <div className="space-y-6">
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl relative overflow-hidden">
            {/* Animated background glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
            
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live Job Status</CardTitle>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  <Play className="mr-1 h-3 w-3" /> Berjalan
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progres Pengiriman</span>
                  <span className="font-mono font-medium">145 / 1,204</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[12%] transition-all duration-1000" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-muted-foreground mb-1">Berhasil</span>
                  <span className="text-2xl font-bold text-green-400">142</span>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-muted-foreground mb-1">Gagal</span>
                  <span className="text-2xl font-bold text-red-400">3</span>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-muted-foreground mb-1">Antrean</span>
                  <span className="text-2xl font-bold text-blue-400">1,059</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300">
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl flex-1">
            <CardHeader>
              <CardTitle>Delivery Logs (ACK Receipt)</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10 p-1">
                  <TabsTrigger value="all" className="text-xs data-[state=active]:bg-white/10">All</TabsTrigger>
                  <TabsTrigger value="sent" className="text-xs data-[state=active]:bg-white/10">Sent</TabsTrigger>
                  <TabsTrigger value="delivered" className="text-xs data-[state=active]:bg-white/10">Delivered</TabsTrigger>
                  <TabsTrigger value="read" className="text-xs data-[state=active]:bg-white/10">Read</TabsTrigger>
                  <TabsTrigger value="failed" className="text-xs data-[state=active]:bg-white/10">Failed</TabsTrigger>
                </TabsList>
                
                <div className="mt-4 border border-white/10 rounded-md overflow-hidden bg-white/5">
                  <Table>
                    <TableHeader className="bg-black/40 hover:bg-black/40 border-b border-white/10">
                      <TableRow>
                        <TableHead className="text-xs text-white/60">Phone</TableHead>
                        <TableHead className="text-xs text-white/60">Status</TableHead>
                        <TableHead className="text-xs text-white/60 text-right">Waktu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { phone: "62812***", status: "read", icon: CheckCheck, color: "text-blue-400", time: "10:42:01" },
                        { phone: "62898***", status: "delivered", icon: CheckCheck, color: "text-gray-400", time: "10:41:55" },
                        { phone: "62855***", status: "sent", icon: Check, color: "text-gray-500", time: "10:41:40" },
                        { phone: "62877***", status: "failed", icon: XCircle, color: "text-red-400", time: "10:40:12" },
                      ].map((log, i) => (
                        <TableRow key={i} className="border-b border-white/5 hover:bg-white/5">
                          <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 ${log.color}`}>
                              <log.icon className="h-3 w-3" />
                              <span className="text-xs capitalize">{log.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{log.time}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
