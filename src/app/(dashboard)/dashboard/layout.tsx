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
import { doc } from 'firebase/firestore';
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
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  // Fetch the salon document. The dashboard will wait until this is loaded.
  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

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

  // Once user and salon data are confirmed, render the full dashboard layout.
  return (
    <div>
      <HeaderActionsProvider>
        <SidebarProvider>
          {!isHomePage && (
            <Sidebar>
              <SidebarHeader>
                <div className="flex h-16 items-center gap-2 border-b p-2">
                  <Logo className="h-8 w-8 shrink-0 text-primary" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-headline text-lg">
                      {salon?.name || 'SalonFlow'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Your Dashboard
                    </span>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarContent className="p-2">
                <MainNav salon={salon} />
              </SidebarContent>
              <SidebarFooter>
                <Separator className="my-2" />
                <div className="p-2 text-center text-xs text-muted-foreground">
                  <p>&copy; {new Date().getFullYear()} SalonFlow India</p>
                </div>
              </SidebarFooter>
            </Sidebar>
          )}
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
              {!isHomePage && <SidebarTrigger className="md:hidden" />}
              <div className="flex items-center gap-4">
                {!isHomePage && <PageHeader />}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {!isHomePage && <HeaderActions />}
                <UserNav />
              </div>
            </header>
            <SubscriptionBanner salon={salon} />
            <main className={`flex flex-1 flex-col ${isHomePage ? 'items-center' : ''} gap-4 bg-background p-4`}>
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </HeaderActionsProvider>
    </div>
  );
}
