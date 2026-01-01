'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { HeaderActionsProvider } from '@/components/dashboard/header-actions-context';
import { PageHeader } from '@/components/page-header';
import { Loader2 } from 'lucide-react';
import { HeaderActions } from '@/components/dashboard/header-actions';
import { doc } from 'firebase/firestore';
import type { Salon } from '@/lib/data';

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
  const [themeColor, setThemeColor] = useState<string | null>(null);

  // Effect to protect the route.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const salonId = user?.uid;
  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);
  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

  // Effect for efficient theme loading
  useEffect(() => {
    // On initial load, try to get color from localStorage for speed
    const storedColor = localStorage.getItem(THEME_COLOR_KEY);
    if (storedColor) {
      setThemeColor(storedColor);
      document.documentElement.style.setProperty('--primary', storedColor);
    } else {
      document.documentElement.style.setProperty('--primary', DEFAULT_THEME_COLOR);
    }

    // When salon data loads from Firestore, update theme and localStorage
    if (salon) {
      const newColor = salon.themeColor || DEFAULT_THEME_COLOR;
      if (newColor !== themeColor) {
        setThemeColor(newColor);
        localStorage.setItem(THEME_COLOR_KEY, newColor);
        document.documentElement.style.setProperty('--primary', newColor);
      }
    }
  }, [salon, themeColor]);


  // Main loading state while checking user auth.
  if (isUserLoading || (salonId && isSalonLoading)) {
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

  // Once user is confirmed, render the layout.
  return (
    <div>
      <HeaderActionsProvider>
        <SidebarProvider>
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
            <main className="flex flex-1 flex-col gap-4 bg-background p-4 md:gap-8 md:p-10">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </HeaderActionsProvider>
    </div>
  );
}
