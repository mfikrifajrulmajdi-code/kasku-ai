'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Webhook, CreditCard, Save, Bot, Key, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface SettingsData {
  webhookUrl: string;
  groqApiKey: string;
  autoReply: boolean;
  productionMode: boolean;
}

export default function SettingsPage() {
  // Replace useToast hook with mock or import from your specific toast implementation if different
  // Assuming a generic toast function based on shadcn docs if useToast is complex
  // For this example, we'll implement a simple state-based toast if useToast hook isn't directly usable
  const [toastMessage, setToastMessage] = useState<{title: string, desc: string, type: 'success' | 'error'} | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    webhookUrl: '',
    groqApiKey: '',
    autoReply: false,
    productionMode: false,
  });

  // Mock env variables for Midtrans
  const MIDTRANS_MERCHANT_ID = process.env.NEXT_PUBLIC_MIDTRANS_MERCHANT_ID || 'G-123456789';
  const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-xxxxxxxxxxx';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // const res = await fetch('/api/settings');
        // const data = await res.json();
        
        // Simulating API response
        setTimeout(() => {
          setSettings({
            webhookUrl: 'https://api.example.com/webhook/wa',
            groqApiKey: 'gsk_xxxxxxxxxxxxxxxxxxxxxx',
            autoReply: true,
            productionMode: false,
          });
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching settings', error);
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // await fetch('/api/settings', {
      //   method: 'POST',
      //   body: JSON.stringify(settings)
      // });
      
      // Simulating save
      setTimeout(() => {
        setSaving(false);
        setToastMessage({
          title: "Settings Saved",
          desc: "Your configuration has been updated successfully.",
          type: 'success'
        });
        
        // Hide toast after 3s
        setTimeout(() => setToastMessage(null), 3000);
      }, 1000);
    } catch (error) {
      console.error('Error saving settings', error);
      setSaving(false);
      setToastMessage({
        title: "Error",
        desc: "Failed to save settings. Please try again.",
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-8 pt-6 bg-[#0a0a0f] min-h-screen text-slate-50">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 bg-indigo-900/20" />
          <Skeleton className="h-4 w-96 bg-indigo-900/20" />
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="h-[300px] rounded-xl bg-indigo-900/10" />
          <Skeleton className="h-[300px] rounded-xl bg-indigo-900/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 bg-[#0a0a0f] min-h-screen text-slate-50 relative">
      {/* Custom Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-2xl border flex items-start gap-3 z-50 animate-in slide-in-from-bottom-5 ${
          toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30' : 'bg-rose-950/90 border-rose-500/30'
        }`}>
          <div className={`mt-0.5 rounded-full p-1 ${toastMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {toastMessage.type === 'success' ? <Save className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${toastMessage.type === 'success' ? 'text-emerald-100' : 'text-rose-100'}`}>{toastMessage.title}</h4>
            <p className={`text-sm ${toastMessage.type === 'success' ? 'text-emerald-200/70' : 'text-rose-200/70'}`}>{toastMessage.desc}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-8 w-8 text-indigo-400" />
            System Configuration
          </h2>
          <p className="text-slate-400 mt-2">
            Manage global platform settings, API integrations, and payment gateways.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all px-8 rounded-full"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </span>
          )}
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Webhook & API Card */}
        <Card className="bg-[#12121a]/60 backdrop-blur-xl border-indigo-500/20 shadow-xl overflow-hidden relative group hover:border-indigo-500/40 transition-colors duration-500">
          <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-[100px] group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
          <CardHeader>
            <CardTitle className="text-indigo-100 flex items-center gap-2 text-xl">
              <Webhook className="h-5 w-5 text-blue-400" />
              Integration & AI Settings
            </CardTitle>
            <CardDescription className="text-slate-400">Configure core webhooks and AI model providers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl" className="text-slate-300 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-slate-500" /> Webhook URL
              </Label>
              <Input 
                id="webhookUrl" 
                placeholder="https://your-domain.com/webhook"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                className="bg-[#0a0a0f]/80 border-indigo-900/50 focus-visible:ring-blue-500 text-slate-200 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">The endpoint where WhatsApp events will be delivered.</p>
            </div>
            
            <Separator className="bg-indigo-900/30" />
            
            <div className="space-y-2">
              <Label htmlFor="groqApiKey" className="text-slate-300 flex items-center gap-2">
                <Key className="h-4 w-4 text-slate-500" /> Groq API Key
              </Label>
              <Input 
                id="groqApiKey" 
                type="password"
                placeholder="gsk_..."
                value={settings.groqApiKey}
                onChange={(e) => setSettings({...settings, groqApiKey: e.target.value})}
                className="bg-[#0a0a0f]/80 border-indigo-900/50 focus-visible:ring-blue-500 text-slate-200 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">Required for advanced AI processing capabilities.</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-950/20 rounded-lg border border-indigo-900/30">
              <div className="space-y-0.5">
                <Label className="text-base text-slate-200 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-400" /> Global Auto-Reply
                </Label>
                <p className="text-xs text-slate-400">Enable AI responses platform-wide by default</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.autoReply}
                  onChange={(e) => setSettings({...settings, autoReply: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Payment Gateway Card */}
        <Card className="bg-[#12121a]/60 backdrop-blur-xl border-indigo-500/20 shadow-xl overflow-hidden relative group hover:border-indigo-500/40 transition-colors duration-500">
          <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-[100px] group-hover:bg-amber-500/10 transition-colors duration-500"></div>
          <CardHeader>
            <CardTitle className="text-indigo-100 flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-amber-400" />
              Payment Gateway
            </CardTitle>
            <CardDescription className="text-slate-400">Midtrans credentials and environment configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-2">
              <Label className="text-slate-300">Merchant ID</Label>
              <div className="flex bg-[#0a0a0f]/80 border border-indigo-900/50 rounded-md px-3 py-2 opacity-70">
                <span className="text-slate-400 font-mono text-sm">{MIDTRANS_MERCHANT_ID}</span>
              </div>
              <p className="text-xs text-slate-500">Configured via environment variables.</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Client Key</Label>
              <div className="flex bg-[#0a0a0f]/80 border border-indigo-900/50 rounded-md px-3 py-2 opacity-70">
                <span className="text-slate-400 font-mono text-sm">{MIDTRANS_CLIENT_KEY.substring(0, 8)}••••••••••••••••</span>
              </div>
            </div>

            <Separator className="bg-indigo-900/30" />

            <div className="flex items-center justify-between p-4 bg-amber-950/10 rounded-lg border border-amber-900/20">
              <div className="space-y-0.5">
                <Label className="text-base text-slate-200">Production Mode</Label>
                <p className="text-xs text-slate-400">Toggle between Sandbox and Production</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.productionMode}
                  onChange={(e) => setSettings({...settings, productionMode: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
            
            {settings.productionMode && (
              <div className="bg-amber-950/40 border border-amber-700/50 text-amber-200 p-3 rounded-md text-sm flex gap-2 items-start mt-4 animate-in fade-in">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
                <p>Warning: Production mode is active. Real transactions will be processed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
