"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Plus, Upload, Download, CheckCircle, Edit, Trash2 } from "lucide-react";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([
    { id: 1, name: "Budi Santoso", phone: "628123456789", tags: ["VIP", "Customer"], notes: "Pelanggan setia", status: "Valid" },
    { id: 2, name: "Siti Aminah", phone: "628987654321", tags: ["Lead"], notes: "Tanya promo", status: "Belum Cek" },
  ]);

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
          📇 Buku Kontak & Tagging Manager
        </h1>
        <p className="text-muted-foreground">
          Kelola data pelanggan, label VIP/Lead, serta impor/ekspor CSV
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama, nomor, catatan..."
              className="pl-8 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-white/20 w-full"
            />
          </div>
          <select className="flex h-10 w-[180px] items-center justify-between rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20">
            <option value="">Semua Tag</option>
            <option value="vip">VIP</option>
            <option value="lead">Lead</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <Upload className="mr-2 h-4 w-4" />
                Impor CSV
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px] bg-black/90 backdrop-blur-2xl border-white/10">
              <DialogHeader>
                <DialogTitle>Impor Kontak via CSV</DialogTitle>
                <DialogDescription>
                  Paste teks CSV di bawah ini atau upload file CSV Anda.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <textarea
                  className="min-h-[150px] w-full rounded-md border border-white/10 bg-black/50 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                  placeholder="nama,nomor,tag,catatan&#10;John Doe,628...,VIP,catatan..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-white text-black hover:bg-white/90">Impor Sekarang</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
            <Download className="mr-2 h-4 w-4" />
            Ekspor CSV
          </Button>
          
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-blue-400 hover:text-blue-300">
            <CheckCircle className="mr-2 h-4 w-4" />
            Cek WA Aktif
          </Button>

          <Dialog>
            <DialogTrigger render={
              <Button className="bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kontak
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px] bg-black/90 backdrop-blur-2xl border-white/10">
              <DialogHeader>
                <DialogTitle>Tambah Kontak Baru</DialogTitle>
                <DialogDescription>
                  Masukkan detail kontak pelanggan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama</Label>
                  <Input id="name" placeholder="John Doe" className="bg-black/50 border-white/10" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Nomor HP</Label>
                  <Input id="phone" placeholder="628..." className="bg-black/50 border-white/10" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags (pisahkan dengan koma)</Label>
                  <Input id="tags" placeholder="VIP, Lead" className="bg-black/50 border-white/10" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Input id="notes" placeholder="Catatan tambahan..." className="bg-black/50 border-white/10" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-white text-black hover:bg-white/90">Simpan Kontak</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/70">Nama</TableHead>
                <TableHead className="text-white/70">Nomor HP</TableHead>
                <TableHead className="text-white/70">Label/Tags</TableHead>
                <TableHead className="text-white/70">Catatan</TableHead>
                <TableHead className="text-white/70">Status WA</TableHead>
                <TableHead className="text-right text-white/70">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{contact.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 flex-wrap">
                      {contact.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-transparent">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {contact.notes}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      contact.status === 'Valid' 
                        ? 'border-green-500/30 text-green-400 bg-green-500/10' 
                        : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                    }>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
