'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainNav } from '@/components/dashboard/main-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/logo';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { HeaderActionsProvider } from '@/components/dashboard/header-actions-context';
import { PageHeader } from '@/components/page-header';
import { Loader2 } from 'lucide-react';
import { HeaderActions } from '@/components/dashboard/header-actions';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import { SubscriptionBanner } from '@/components/dashboard/subscription-banner';

const THEME_COLOR_KEY = 'salonflow-theme-color';
const DEFAULT_THEME_COLOR = '275 100% 25.3%';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const isHomePage = pathname === '/dashboard/home';

  // Effect to protect the route.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // The user's UID is the salon's ID upon signup.
  const salonId = user?.uid;
  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId, isUserLoading]);

  // Fetch the salon document. The dashboard will wait until this is loaded.
  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

  // Effect to enforce subscription gating on expired free trials.
  useEffect(() => {
    if (!isSalonLoading && salon) {
      const trialEndsAt = salon.trialEndsAt ? (salon.trialEndsAt as Timestamp).toDate() : null;
      const isTrialExpired = trialEndsAt ? trialEndsAt < new Date() : false;
      const hasAccess = salon.billingStatus === 'active' || !isTrialExpired;
      
      if (!hasAccess && pathname !== '/dashboard/my-subscription') {
        router.push('/dashboard/my-subscription');
      }
    }
  }, [salon, isSalonLoading, pathname, router]);

  // Effect to automatically initialize missing salon data for half-created accounts.
  useEffect(() => {
    if (!isSalonLoading && user && !salon && firestore) {
      console.log("Salon document missing. Re-initializing salon and user profile...");
      
      const initializeMissingSalon = async () => {
        try {
          const salonId = user.uid;
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 15);

          // 1. Create the user profile doc
          const userRef = doc(firestore, `salons/${salonId}/users`, user.uid);
          await setDoc(userRef, {
            name: user.displayName || 'Owner',
            role: 'owner',
            email: user.email,
            salonId: salonId,
          });

          // 2. Create the salon doc
          const salonRef = doc(firestore, 'salons', salonId);
          await setDoc(salonRef, {
            salonId: salonId,
            name: 'My Salon',
            ownerId: user.uid,
            appointmentsEnabled: true,
            loyaltyProgramEnabled: true,
            loyaltyPointsRatio: 10,
            address: '',
            city: '',
            state: '',
            phone: '',
            logoUrl: '',
            languageDefault: 'en',
            timezone: 'IST',
            subscriptionPlanId: 'starter',
            billingStatus: 'trialing',
            businessHours: JSON.stringify({}),
            trialEndsAt: Timestamp.fromDate(trialEndsAt),
            themeColor: '275 100% 25.3%',
          });
          
          console.log("Salon data successfully repaired!");
        } catch (err) {
          console.error("Failed to auto-repair salon data:", err);
        }
      };
      
      initializeMissingSalon();
    }
  }, [salon, isSalonLoading, user, firestore]);

  // Effect to manage theme application without causing re-render loops.
  useEffect(() => {
    // Define the color to apply based on a priority system.
    // Priority: 1. Salon data (if loaded), 2. localStorage, 3. Default.
    let colorToApply = DEFAULT_THEME_COLOR;

    if (salon) {
      // If salon data is loaded, it is the source of truth.
      colorToApply = salon.themeColor || DEFAULT_THEME_COLOR;
    } else if (!isSalonLoading) {
      // If salon isn't loading (i.e., initial load before Firestore returns), check localStorage.
      const storedColor = localStorage.getItem(THEME_COLOR_KEY);
      if (storedColor) {
        colorToApply = storedColor;
      }
    }

    // Apply the determined color to the document.
    document.documentElement.style.setProperty('--primary', colorToApply);

    // If salon data was the source, update localStorage to keep it in sync for next time.
    if (salon) {
      localStorage.setItem(THEME_COLOR_KEY, colorToApply);
    }
  }, [salon, isSalonLoading]); // This effect runs only when salon data or its loading state changes.


  // Show a full-page loader while authenticating the user OR fetching the essential salon data.
  // This prevents child components from rendering and making data requests prematurely.
  if (isUserLoading || (user && isSalonLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If user is resolved but not logged in, we shouldn't render anything
  // as the useEffect will trigger a redirect.
  if (!user) {
    return null;
  }

  if (isHomePage) {
    return (
      <HeaderActionsProvider>
        {children}
      </HeaderActionsProvider>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FD]">
      <HeaderActionsProvider>
        <SidebarProvider>
          <Sidebar className="border-r border-slate-200/80 bg-white">
            <SidebarHeader className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                  <Logo className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-serif text-lg font-bold text-slate-900 tracking-tight">
                    {salon?.name || 'Toni & Guy'}
                  </span>
                  <span className="truncate text-xs text-slate-500 font-medium">
                    Your Dashboard
                  </span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="p-3">
              <MainNav salon={salon} />
            </SidebarContent>

            <SidebarFooter className="p-3">
              {/* Go Premium Box */}
              <div className="rounded-2xl bg-purple-50/80 border border-purple-100/90 p-4 text-left shadow-sm mb-2">
                <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs mb-1">
                  <span>👑</span>
                  <span>Go Premium</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug mb-3">
                  Unlock advanced features and grow your business.
                </p>
                <Link
                  href="/dashboard/my-subscription"
                  className="block w-full text-center py-2 px-3 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-100/50 text-xs font-semibold shadow-sm transition-all"
                >
                  Upgrade Now
                </Link>
              </div>

              <div className="pt-2 text-center text-[11px] text-slate-400 font-medium">
                <p>&copy; {new Date().getFullYear()} {salon?.name || 'Toni & Guy'}. All rights reserved.</p>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="bg-[#FAF9FD]">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-[#FAF9FD]/90 backdrop-blur-md px-4 sm:px-8">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="md:hidden" />
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Notification Bell */}
                <button
                  type="button"
                  className="relative h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-600 text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                    3
                  </span>
                </button>

                {/* User Dropdown */}
                <UserNav />

                {/* Date / Month Filter Pill */}
                <div className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white shadow-sm text-xs font-semibold text-slate-700 select-none">
                  <span>🗓️</span>
                  <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <span className="text-[10px] text-slate-400 ml-0.5">▾</span>
                </div>
              </div>
            </header>

            <SubscriptionBanner salon={salon} />

            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </HeaderActionsProvider>
    </div>
  );
}
