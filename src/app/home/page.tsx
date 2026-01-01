'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Loader2, PlusCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CustomerCheckinForm } from '@/components/dashboard/customer-checkin-form';
import { AppointmentForm } from '@/components/dashboard/appointment-form';
import { CalendarView } from '@/components/dashboard/calendar-view';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/dashboard/user-nav';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isCheckinOpen, setCheckinOpen] = useState(false);
  const [isAppointmentOpen, setAppointmentOpen] = useState(false);
  
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

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold">{salon?.name || 'SalonFlow'}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <UserNav />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Dialog open={isCheckinOpen} onOpenChange={setCheckinOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="w-full justify-start py-6 text-base">
                      <UserPlus className="mr-4 h-5 w-5" />
                      Customer Check-in
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Customer Check-in</DialogTitle>
                    </DialogHeader>
                    <CustomerCheckinForm setOpen={setCheckinOpen} />
                  </DialogContent>
                </Dialog>
                {salon?.appointmentsEnabled && (
                  <Dialog
                    open={isAppointmentOpen}
                    onOpenChange={setAppointmentOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full justify-start py-6 text-base">
                        <PlusCircle className="mr-4 h-5 w-5" />
                        New Appointment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>New Appointment</DialogTitle>
                      </DialogHeader>
                      <AppointmentForm setOpen={setAppointmentOpen} />
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
            <div className="mt-4 text-center text-sm">
                <Link href="/dashboard/overview" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                    Go to Full Dashboard
                </Link>
            </div>
          </div>
          <div className="lg:col-span-2">
             {salon?.appointmentsEnabled ? (
                <CalendarView />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Appointments Disabled</CardTitle>
                    <CardDescription>
                      The appointment feature is currently turned off.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      To enable it, go to{' '}
                      <Link href="/dashboard/settings" className="font-medium text-primary underline-offset-4 hover:underline">
                        Settings
                      </Link>{' '}
                      and turn on appointment management.
                    </p>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </main>
    </div>
  );
}
