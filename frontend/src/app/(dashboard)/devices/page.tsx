'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone, QrCode, LogOut, Clock, AlertCircle, RefreshCw, Cpu, Activity, Settings } from 'lucide-react';

export default function DevicesPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const simulateScan = () => {
    setIsScanning(true);
    setQrCodeData(null);
    setTimeout(() => {
      setQrCodeData('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=simulate_wa_login_123');
      setIsScanning(false);
    }, 1500);
  };

  return (
    <div className="flex-1 space-y-6 p-8 bg-slate-950 min-h-screen text-slate-200">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Smartphone className="h-8 w-8 text-violet-500" />
          Multi-Device & Tenant Connection Manager
        </h1>
        <p className="text-slate-400">
          Kelola koneksi WhatsApp per tenant & status socket real-time
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Socket</CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2/5</div>
            <p className="text-xs text-slate-500">Koneksi aktif saat ini</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Memory Usage</CardTitle>
            <Cpu className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142 MB</div>
            <p className="text-xs text-slate-500">Normal (Max 1GB)</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">System Uptime</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-slate-500">14 hari tanpa putus</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Main WhatsApp Session */}
        <Card className="bg-gradient-to-br from-violet-950/40 to-slate-900/80 border-violet-500/20 backdrop-blur-xl flex flex-col shadow-xl shadow-violet-900/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl text-white">Main Session</CardTitle>
                <CardDescription className="text-slate-400 mt-1">Primary Device (Admin)</CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex gap-1.5 items-center">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Terhubung
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="grid gap-2 text-sm text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-500">Phone Number</span>
                <span className="font-medium">+62 812-3456-7890</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-500">Platform</span>
                <span className="font-medium">Mac OS / Desktop</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-500">Uptime</span>
                <span className="font-medium">3d 4h 12m</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Last Activity</span>
                <span className="font-medium">Just now</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="gap-3 border-t border-white/5 pt-4 mt-auto">
            <Dialog>
              <DialogTrigger render={
                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={simulateScan}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan QR Code
                </Button>
              } />
              <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-violet-400" />
                    Connect WhatsApp
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Scan this QR code with your WhatsApp mobile app to link this device.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                  <div className="bg-white p-4 rounded-xl relative shadow-lg shadow-violet-500/20">
                    {isScanning ? (
                      <div className="flex flex-col items-center justify-center w-[250px] h-[250px] space-y-4">
                        <RefreshCw className="h-8 w-8 text-violet-600 animate-spin" />
                        <span className="text-slate-500 text-sm font-medium">Generating secure QR...</span>
                      </div>
                    ) : qrCodeData ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrCodeData} alt="WhatsApp QR Code" className="w-[250px] h-[250px]" />
                    ) : (
                       <div className="flex flex-col items-center justify-center w-[250px] h-[250px] space-y-4">
                          <AlertCircle className="h-8 w-8 text-slate-300" />
                          <span className="text-slate-400 text-sm">QR Code not available</span>
                       </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 rounded-lg w-full space-y-3 border border-white/5">
                    <h4 className="text-sm font-semibold text-slate-200">How to connect:</h4>
                    <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                      <li>Open WhatsApp on your phone</li>
                      <li>Tap Menu <span className="font-bold">⋮</span> or Settings <span className="font-bold">⚙</span></li>
                      <li>Select <span className="font-bold">Linked Devices</span></li>
                      <li>Tap on <span className="font-bold">Link a device</span> and scan</li>
                    </ol>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </CardFooter>
        </Card>

        {/* Tenant 1 */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl flex flex-col shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                #TENANT-001
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 flex gap-1.5 items-center">
                <Clock className="h-3 w-3" />
                Menunggu Scan
              </Badge>
            </div>
            <CardTitle className="text-lg text-white">Glow Clinic Beauty</CardTitle>
            <CardDescription className="text-slate-400">Customer Support Bot</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
             <div className="grid gap-2 text-sm text-slate-300">
               <div className="flex justify-between items-center py-1 border-b border-white/5">
                 <span className="text-slate-500">Status</span>
                 <span className="text-yellow-400">Not Connected</span>
               </div>
               <div className="flex justify-between items-center py-1 border-b border-white/5">
                 <span className="text-slate-500">Messages/day</span>
                 <span className="font-medium">-</span>
               </div>
             </div>
          </CardContent>
          <CardFooter className="gap-3 border-t border-white/5 pt-4 mt-auto">
             <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Hubungkan Device
             </Button>
             <Button variant="ghost" size="icon" className="shrink-0 text-slate-400 hover:text-white">
               <Settings className="h-4 w-4" />
             </Button>
          </CardFooter>
        </Card>

        {/* Tenant 2 */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl flex flex-col shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                #TENANT-002
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 flex gap-1.5 items-center">
                <AlertCircle className="h-3 w-3" />
                Terputus
              </Badge>
            </div>
            <CardTitle className="text-lg text-white">AutoParts Store</CardTitle>
            <CardDescription className="text-slate-400">Sales Order Bot</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
             <div className="grid gap-2 text-sm text-slate-300">
               <div className="flex justify-between items-center py-1 border-b border-white/5">
                 <span className="text-slate-500">Status</span>
                 <span className="text-red-400">Disconnected (2h ago)</span>
               </div>
               <div className="flex justify-between items-center py-1 border-b border-white/5">
                 <span className="text-slate-500">Phone Number</span>
                 <span className="font-medium">+62 899-0000-1111</span>
               </div>
             </div>
          </CardContent>
          <CardFooter className="gap-3 border-t border-white/5 pt-4 mt-auto">
             <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" onClick={simulateScan}>
                Re-connect Device
             </Button>
             <Button variant="ghost" size="icon" className="shrink-0 text-slate-400 hover:text-white">
               <Settings className="h-4 w-4" />
             </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
