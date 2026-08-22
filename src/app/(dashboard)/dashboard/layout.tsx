'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
    <div>
      <HeaderActionsProvider>
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <div className="flex h-16 items-center gap-2 border-b border-sidebar-border p-2">
                <Logo className="h-8 w-8 shrink-0 text-primary" />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-headline text-lg font-bold tracking-tight">
                    SALON FLOW
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Your Dashboard
                  </span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
              <MainNav salon={salon} />
            </SidebarContent>
            <SidebarFooter>
              <Separator className="my-2 bg-sidebar-border" />
              <div className="p-2 text-center text-xs text-sidebar-foreground/70">
                <p>&copy; {new Date().getFullYear()} SalonFlow India</p>
              </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
              <SidebarTrigger className="md:hidden" />
              <div className="flex items-center gap-4">
                <PageHeader />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <HeaderActions />
                <UserNav />
              </div>
            </header>
            <SubscriptionBanner salon={salon} />
            <main className="flex flex-1 flex-col gap-4 bg-background p-4">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </HeaderActionsProvider>
    </div>
  );
}
