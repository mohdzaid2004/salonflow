'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainNav } from '@/components/dashboard/main-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/logo';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { HeaderActionsProvider } from '@/components/dashboard/header-actions-context';
import { Loader2, Menu, X, Bell, Crown, Sparkles } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import { SubscriptionBanner } from '@/components/dashboard/subscription-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const salonDocRef = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'salons', user.uid);
  }, [firestore, user?.uid]);

  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isUserLoading || (user && isSalonLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAF9FD]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100 shadow-sm animate-pulse">
            <Logo className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Loading SalonFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Home Check-in page has its own full bleed layout
  const isHomePage = pathname === '/dashboard/home';
  if (isHomePage) {
    return (
      <HeaderActionsProvider>
        {children}
      </HeaderActionsProvider>
    );
  }

  const salonName = salon?.name || 'Toni & Guy';

  return (
    <HeaderActionsProvider>
      <div className="min-h-screen bg-[#FAF9FD] text-slate-900 flex flex-col md:flex-row">
        
        {/* Desktop Fixed Left Sidebar (100vh, No Scrollbar, Fixed Width 240px) */}
        <aside className="hidden md:flex flex-col justify-between fixed top-0 left-0 w-[240px] h-screen bg-white border-r border-slate-200/80 z-30 select-none">
          
          {/* Top Section: Logo & Nav */}
          <div className="flex flex-col">
            {/* Salon Brand Header */}
            <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-100">
              <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                <Logo className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="truncate font-serif text-base font-bold text-slate-900 tracking-tight">
                  {salonName}
                </span>
                <span className="truncate text-[11px] text-slate-400 font-medium">
                  Your Dashboard
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="py-2.5 px-2">
              <MainNav salon={salon} />
            </div>
          </div>

          {/* Bottom Section: Go Premium & Copyright */}
          <div className="p-3 border-t border-slate-100 bg-white">
            {/* Go Premium Box */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-50/90 to-indigo-50/60 border border-purple-100/90 p-3.5 text-left shadow-sm mb-2">
              <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs mb-1">
                <Crown className="w-3.5 h-3.5 text-purple-600" />
                <span>Go Premium</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight mb-2.5">
                Unlock advanced features & growth tools.
              </p>
              <Link
                href="/dashboard/my-subscription"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-[11px] font-bold shadow-xs transition-all"
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>Upgrade Now</span>
              </Link>
            </div>

            <div className="text-center text-[10px] text-slate-400 font-medium">
              <p>&copy; {new Date().getFullYear()} {salonName}. All rights reserved.</p>
            </div>
          </div>
        </aside>

        {/* Mobile Header Bar */}
        <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6 text-purple-600" />
              <span className="font-serif font-bold text-sm truncate max-w-[140px]">{salonName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UserNav />
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-slate-900/40 backdrop-blur-xs flex">
            <div className="w-[260px] h-full bg-white shadow-2xl flex flex-col justify-between p-4 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    <Logo className="h-6 w-6 text-purple-600" />
                    <span className="font-serif font-bold text-sm truncate">{salonName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <MainNav salon={salon} />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/dashboard/my-subscription"
                  className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-purple-700 text-white text-xs font-bold shadow-sm"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Go Premium</span>
                </Link>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area (Offset by 240px on desktop, Smooth independent scrolling) */}
        <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen bg-[#FAF9FD] min-w-0">
          
          {/* Top Sticky Header on Desktop */}
          <header className="hidden md:flex sticky top-0 z-20 h-16 items-center justify-between border-b border-slate-200/70 bg-[#FAF9FD]/90 backdrop-blur-md px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Salon Management Operating System</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button
                type="button"
                className="relative h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-xs transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                  3
                </span>
              </button>

              {/* User Dropdown */}
              <UserNav />

              {/* Date Filter Pill */}
              <div className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white shadow-xs text-xs font-semibold text-slate-700 select-none">
                <span>🗓️</span>
                <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <span className="text-[10px] text-slate-400 ml-0.5">▾</span>
              </div>
            </div>
          </header>

          <SubscriptionBanner salon={salon} />

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

      </div>
    </HeaderActionsProvider>
  );
}
