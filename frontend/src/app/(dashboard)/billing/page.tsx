'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown } from 'lucide-react';

export default function BillingPage() {
  const handleCheckout = (planId: string) => {
    fetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ planId }) });
    alert(`Mengarahkan ke Midtrans Checkout untuk paket ${planId}...`);
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Rp 99k',
      period: '/ bulan',
      quota: '1,000 Pesan / bulan',
      features: ['1 Device WA', 'Auto-Reply Basic', 'Support Email'],
      icon: <Zap className="w-5 h-5 text-blue-400" />,
      cardClass: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
      badgeClass: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
      checkClass: 'text-blue-400',
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white border-0'
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 'Rp 299k',
      period: '/ bulan',
      quota: '5,000 Pesan / bulan',
      features: ['3 Device WA', 'Auto-Reply Advanced', 'Broadcast Basic', 'Support Chat'],
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      cardClass: 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/10',
      badgeClass: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
      checkClass: 'text-emerald-400',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-0',
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'Rp 599k',
      period: '/ bulan',
      quota: '15,000 Pesan / bulan',
      features: ['10 Device WA', 'API Access', 'Drip Sequences', 'Priority Support'],
      icon: <Crown className="w-5 h-5 text-violet-400" />,
      cardClass: 'hover:border-violet-500/50 hover:shadow-violet-500/10',
      badgeClass: 'border-violet-500/30 text-violet-400 bg-violet-500/10',
      checkClass: 'text-violet-400',
      btnClass: 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-0',
      isCurrent: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Rp 1.5M',
      period: '/ bulan',
      quota: 'Unlimited Pesan',
      features: ['Unlimited Devices', 'Dedicated Server', 'White-label Dashboard', '24/7 Phone Support'],
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      cardClass: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
      badgeClass: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
      checkClass: 'text-amber-400',
      btnClass: 'bg-amber-600 hover:bg-amber-700 text-white border-0'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
          💳 Paket Langganan & Auto-Billing SaaS
        </h1>
        <p className="text-slate-400 mt-2">Kelola paket berlangganan dan kuota pesan Anda</p>
      </div>

      <Card className="bg-slate-900/60 border-amber-500/20 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3 text-slate-200">
            Current Plan
            <Badge className="bg-violet-600 hover:bg-violet-700 border-0">Pro Plan</Badge>
          </CardTitle>
          <CardDescription className="text-slate-400">Aktif sampai 27 Agustus 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Penggunaan Kuota Pesan</span>
              <span className="text-slate-200 font-medium">12,450 / 15,000</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-3 rounded-full" style={{ width: '83%' }}></div>
            </div>
            <p className="text-xs text-slate-500 pt-1">Kuota Anda akan direset pada awal bulan penagihan berikutnya.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={`bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg ${plan.cardClass}`}>
            {plan.popular && (
              <div className="absolute top-0 inset-x-0">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-xs font-bold text-center py-1">
                  Paling Populer
                </div>
              </div>
            )}
            <CardHeader className={plan.popular ? "pt-8" : ""}>
              <div className="flex items-center gap-2 mb-2">
                {plan.icon}
                <CardTitle className="text-xl text-slate-200">{plan.name}</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <Badge variant="outline" className={`mt-2 ${plan.badgeClass}`}>
                {plan.quota}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.checkClass}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className={`w-full ${plan.btnClass}`}
                variant={plan.isCurrent ? 'secondary' : 'default'}
                onClick={() => handleCheckout(plan.id)}
              >
                {plan.isCurrent ? 'Current Plan' : 'Upgrade / Perpanjang'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
