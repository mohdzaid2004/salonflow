'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CustomerCheckinForm } from '@/components/dashboard/customer-checkin-form';
import { useHeaderActions } from '@/components/dashboard/header-actions-context';
import { UserPlus, PlusCircle } from 'lucide-react';
import { CalendarView } from '@/components/dashboard/calendar-view';
import { AppointmentForm } from '@/components/dashboard/appointment-form';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { setActions } = useHeaderActions();
  const [isCheckinOpen, setCheckinOpen] = useState(false);
  const [isAppointmentOpen, setAppointmentOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const salonId = user?.uid;
  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);
  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

  useEffect(() => {
    if (salon?.appointmentsEnabled) {
      setActions(
        <div className="flex gap-2">
          <Dialog open={isCheckinOpen} onOpenChange={setCheckinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
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
          <Dialog open={isAppointmentOpen} onOpenChange={setAppointmentOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
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
        </div>
      );
    } else {
      setActions(null);
    }
    // Cleanup on unmount
    return () => setActions(null);
  }, [setActions, isCheckinOpen, isAppointmentOpen, salon]);

  if (isSalonLoading) {
    return null; // Or a skeleton loader
  }

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
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
              <a href="/dashboard/settings" className="font-medium text-primary underline-offset-4 hover:underline">
                Settings
              </a>{' '}
              and turn on the appointment management feature.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
