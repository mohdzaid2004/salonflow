'use client';

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
import { doc } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import { Skeleton } from '../ui/skeleton';
import { HeaderActionsProvider } from './header-actions-context';
import { HeaderActions } from './header-actions';
import { PageHeader } from '../page-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const firestore = useFirestore();

  const salonId = user?.uid;

  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

  return (
    <HeaderActionsProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex h-16 items-center gap-2 border-b p-2">
              <Logo className="h-8 w-8 shrink-0 text-primary" />
              <div className="flex flex-col overflow-hidden">
                {isSalonLoading ? (
                  <>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="mt-1 h-4 w-32" />
                  </>
                ) : (
                  <>
                    <span className="truncate font-headline text-lg">
                      {salon?.name || 'SalonFlow'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {salon?.name || 'Your Salon'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <MainNav />
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
  );
}
