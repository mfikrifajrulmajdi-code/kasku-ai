import Link from 'next/link';
import {
  Smartphone,
  Building2,
  MessageSquare,
  Bot,
  QrCode,
  Settings,
  Beaker,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-slate-400">
          Welcome back! Here's an overview of your KasKu AI control center.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* WhatsApp Status Card */}
        <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">WhatsApp Status</CardTitle>
            <Smartphone className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">Connected</div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
              Online
            </Badge>
          </CardContent>
        </Card>

        {/* Total Tenants Card */}
        <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">12</div>
            <p className="text-xs text-slate-400">+2 this week</p>
          </CardContent>
        </Card>

        {/* Messages Today Card */}
        <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Messages Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">1,492</div>
            <p className="text-xs text-slate-400">+12% from yesterday</p>
          </CardContent>
        </Card>

        {/* Active Agents Card */}
        <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">10</div>
            <p className="text-xs text-slate-400">All instances running</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Connection/QR Section */}
        <Card className="col-span-full lg:col-span-4 bg-slate-900/50 border-white/5 backdrop-blur-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-white">Master WhatsApp Connection</CardTitle>
            <CardDescription className="text-slate-400">
              Manage the primary WhatsApp connection for routing tenant messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="h-48 w-48 rounded-xl bg-slate-950 flex flex-col items-center justify-center border border-white/10 mb-6 shadow-inner relative overflow-hidden">
              {/* Connected State Placeholder */}
              <div className="absolute inset-0 bg-emerald-500/5 z-0" />
              <QrCode className="h-16 w-16 text-emerald-400 mb-3 z-10 opacity-80" />
              <p className="text-sm text-emerald-400 font-medium z-10">WhatsApp Terhubung ✅</p>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Socket.IO integration for live QR updates and real-time status monitoring will be implemented soon.
            </p>
          </CardContent>
          <Separator className="bg-white/5" />
          <CardFooter className="pt-6">
            <Button variant="outline" className="w-full bg-slate-950 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white">
              Disconnect Device
            </Button>
          </CardFooter>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-full lg:col-span-3 bg-slate-900/50 border-white/5 backdrop-blur-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">
              Jump right into managing your multi-tenant system.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <Link href="/admin/tenants" className="block group">
              <div className="flex items-center p-4 rounded-xl border border-white/5 bg-slate-950/50 hover:bg-violet-500/10 hover:border-violet-500/20 transition-all duration-200">
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center mr-4 group-hover:bg-violet-500/30 transition-colors">
                  <Building2 className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-200">Manage Tenants</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Add, edit, or configure endpoints</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
              </div>
            </Link>

            <Link href="/sandbox" className="block group">
              <div className="flex items-center p-4 rounded-xl border border-white/5 bg-slate-950/50 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all duration-200">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center mr-4 group-hover:bg-blue-500/30 transition-colors">
                  <Beaker className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-200">Test Sandbox</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Simulate WhatsApp interactions</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>

            <Link href="/settings" className="block group">
              <div className="flex items-center p-4 rounded-xl border border-white/5 bg-slate-950/50 hover:bg-slate-800/80 hover:border-white/10 transition-all duration-200">
                <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center mr-4 group-hover:bg-slate-700 transition-colors">
                  <Settings className="h-5 w-5 text-slate-300" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-200">System Settings</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Configure webhooks and core params</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
