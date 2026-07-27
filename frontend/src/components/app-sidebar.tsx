'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Settings,
  ShoppingBag,
  Beaker,
  LogOut,
  Bot,
  Menu,
  Smartphone,
  Users,
  Radio,
  Layers,
  Clock,
  Key,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { name: 'Devices', href: '/devices', icon: Smartphone },
  { name: 'Kontak', href: '/contacts', icon: Users },
  { name: 'Broadcast', href: '/broadcast', icon: Radio },
  { name: 'Groups', href: '/groups', icon: Layers },
  { name: 'Sequences', href: '/sequences', icon: Clock },
  { name: 'Developer', href: '/developer', icon: Key },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Katalog', href: '/katalog', icon: ShoppingBag },
  { name: 'Sandbox', href: '/sandbox', icon: Beaker },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 py-4 border-b border-white/5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          KasKu AI
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-violet-500/10 text-violet-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <item.icon
                className={`h-5 w-5 ${isActive ? 'text-violet-400' : 'text-slate-500'}`}
              />
              {item.name}
              {isActive && (
                <span className="ml-auto w-1.5 h-4 rounded-full bg-violet-500" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 z-50 bg-slate-950/50 backdrop-blur-xl border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile Header with Sheet */}
      <div className="lg:hidden flex items-center justify-between p-4 sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">KasKu AI</span>
        </div>
        <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="text-slate-300">
              <Menu className="h-6 w-6" />
            </Button>
          } />
          <SheetContent
            side="left"
            className="w-72 p-0 bg-slate-950/95 border-r border-white/10"
          >
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
