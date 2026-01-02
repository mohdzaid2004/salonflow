'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/dashboard/user-nav';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import type { Salon } from '@/lib/data';

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const salonId = user?.uid;
  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);
  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || isSalonLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardLink = '/dashboard/services';

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Link href={dashboardLink} className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold">{salon?.name || 'SalonFlow'}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <UserNav />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
            <div className="mt-4 text-center text-sm">
                <Link href={dashboardLink} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                    Manage Your Salon
                </Link>
            </div>
        </div>
      </main>
    </div>
  );
}
