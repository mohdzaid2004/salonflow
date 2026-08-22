'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainNav } from '@/components/dashboard/main-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/logo';
import { useDoc, useFirestore, useUser, useAuth } from '@/firebase';
import { HeaderActionsProvider } from '@/components/dashboard/header-actions-context';
import { Loader2, Menu, X, Bell, LogOut, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { Salon } from '@/lib/data';
import { SubscriptionBanner } from '@/components/dashboard/subscription-banner';
import { AIAssistantModal } from '@/components/dashboard/ai-assistant-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
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

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'SM';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (isUserLoading || (user && isSalonLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090B]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#181326] flex items-center justify-center border border-purple-900/40 shadow-sm animate-pulse">
            <Logo className="h-6 w-6 text-[#8B5CF6]" />
          </div>
          <p className="text-xs font-semibold text-slate-400">Loading SalonFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check-in page has its own standalone full screen layout
  const isHomePage = pathname === '/dashboard/home';
  if (isHomePage) {
    return (
      <HeaderActionsProvider>
        {children}
      </HeaderActionsProvider>
    );
  }

  const managerName = user.displayName || salon?.name || 'Salon Manager';
  const managerEmail = user.email || 'manager@salon.com';

  return (
    <HeaderActionsProvider>
      <div className="min-h-screen bg-[#FAF9FD] text-slate-900 flex flex-col md:flex-row">
        
        {/* Desktop Fixed Left Sidebar (Pure Black #000000, Border #1F1F1F, 100vh Height) */}
        <aside className="hidden md:flex flex-col justify-between fixed top-0 left-0 w-[240px] h-screen bg-[#000000] border-r border-[#1F1F1F] z-30 select-none">
          
          {/* Top: SalonFlow Purple Logo + Light Grey Brand Text */}
          <div className="flex flex-col">
            <div className="h-16 px-4 flex items-center gap-2.5 border-b border-[#1F1F1F]">
              <div className="h-8 w-8 rounded-lg bg-[#181326] flex items-center justify-center text-[#8B5CF6] shrink-0 border border-purple-900/40">
                <Logo className="h-5 w-5 text-[#8B5CF6]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base text-[#D1D5DB] tracking-tight font-sans">
                  SalonFlow
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="py-3 px-2">
              <MainNav salon={salon} />
            </div>
          </div>

          {/* Bottom Section: Logged-in Salon/User Profile */}
          <div className="p-3 border-t border-[#1F1F1F] bg-[#000000]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0F0F11] border border-[#1F1F1F] hover:border-purple-900/40 transition-colors">
              
              <Link 
                href="/dashboard/settings" 
                className="flex items-center gap-2.5 min-w-0 flex-1 group"
                title="View Settings & Profile"
              >
                <Avatar className="h-8 w-8 bg-[#181326] border border-purple-900/50 text-[#8B5CF6] text-xs font-bold shrink-0">
                  {user.photoURL && <AvatarImage src={user.photoURL} alt={managerName} />}
                  <AvatarFallback className="bg-[#181326] text-[#A855F7] font-bold">
                    {getInitials(managerName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-bold text-[#F3F4F6] group-hover:text-white transition-colors">
                    {managerName}
                  </span>
                  <span className="truncate text-[10px] text-[#9CA3AF] font-medium">
                    {managerEmail}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#1A1A1E] transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </aside>

        {/* Mobile Header Bar */}
        <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1F1F1F] bg-[#000000] px-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-xl border border-[#27272A] bg-[#121214] text-[#D1D5DB] shadow-xs"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-[#181326] flex items-center justify-center text-[#8B5CF6]">
                <Logo className="h-4 w-4 text-[#8B5CF6]" />
              </div>
              <span className="font-bold text-sm text-[#D1D5DB]">SalonFlow</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UserNav />
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/70 backdrop-blur-xs flex">
            <div className="w-[250px] h-full bg-[#000000] border-r border-[#1F1F1F] shadow-2xl flex flex-col justify-between p-4 overflow-y-auto animate-in slide-in-from-left duration-200">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F] mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-[#181326] flex items-center justify-center text-[#8B5CF6]">
                      <Logo className="h-4 w-4 text-[#8B5CF6]" />
                    </div>
                    <span className="font-bold text-sm text-[#D1D5DB]">SalonFlow</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-[#9CA3AF] hover:text-[#D1D5DB]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <MainNav salon={salon} onItemClick={() => setMobileMenuOpen(false)} />
              </div>

              <div className="pt-3 border-t border-[#1F1F1F] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 bg-[#181326] text-[#A855F7] text-xs font-bold">
                    <AvatarFallback className="bg-[#181326] text-[#A855F7]">
                      {getInitials(managerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-bold text-[#F3F4F6]">{managerName}</span>
                    <span className="truncate text-[10px] text-[#9CA3AF]">{managerEmail}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 text-[#9CA3AF] hover:text-[#EF4444]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area (Offset by 240px on desktop) */}
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

          {/* Google AI Studio Powered SalonFlow AI Assistant */}
          <AIAssistantModal />
        </div>

      </div>
    </HeaderActionsProvider>
  );
}
