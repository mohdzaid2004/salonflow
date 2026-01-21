'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  useFirestore,
  useUser,
  useCollection,
} from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, UserPlus } from 'lucide-react';
import type { Staff, Service, Appointment } from '@/lib/data';
import { CustomerCheckinForm } from '@/components/dashboard/customer-checkin-form';
import Link from 'next/link';
import { useHeaderActions } from '@/components/dashboard/header-actions-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const salonId = user?.uid;
  const { setActions } = useHeaderActions();
  const [isCheckinOpen, setCheckinOpen] = useState(false);

  const { todayStart, todayEnd } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    return {
      todayStart: Timestamp.fromDate(todayStart),
      todayEnd: Timestamp.fromDate(todayEnd),
    };
  }, []);

  const appointmentsQuery = useMemo(() => {
    if (!salonId || !firestore) return null;
    return query(
      collection(firestore, `salons/${salonId}/appointments`),
      where('date', '>=', todayStart),
      where('date', '<=', todayEnd)
    );
  }, [salonId, firestore, todayStart, todayEnd]);

  const { data: appointments, isLoading: isLoadingAppointments } =
    useCollection<Appointment>(appointmentsQuery);

  const staffQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);
  const { data: staff, isLoading: isLoadingStaff } =
    useCollection<Staff>(staffQuery);

  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);
  const { data: services, isLoading: isLoadingServices } =
    useCollection<Service>(servicesQuery);

  useEffect(() => {
    if (staff && services) {
      setActions(
        <Dialog open={isCheckinOpen} onOpenChange={setCheckinOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Customer Check-in
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Customer Check-in</DialogTitle>
              <CardDescription>
                Add a new customer and book their appointment.
              </CardDescription>
            </DialogHeader>
            <CustomerCheckinForm
              staff={staff}
              services={services}
              setOpen={setCheckinOpen}
            />
          </DialogContent>
        </Dialog>
      );
    }
    return () => setActions(null);
  }, [setActions, staff, services, isCheckinOpen]);

  const upcomingAppointments = useMemo(() => {
    if (!appointments) return [];
    const now = new Date();
    return appointments
      .filter((appt) => (appt.date as Timestamp).toDate() > now)
      .sort(
        (a, b) =>
          (a.date as Timestamp).toMillis() - (b.date as Timestamp).toMillis()
      )
      .slice(0, 3);
  }, [appointments]);

  const getServiceName = (id: string) =>
    services?.find((s) => s.id === id)?.name || '...';
  const getStaffName = (id: string) =>
    staff?.find((s) => s.id === id)?.name || '...';

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>
              Here's a quick look at your day. Use the check-in button to manage walk-ins.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingAppointments || isLoadingServices || isLoadingStaff ? (
                <p>Loading appointments...</p>
              ) : upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between rounded-md border p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {(appt.date as Timestamp).toDate().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appt.customerName} -{' '}
                        {appt.serviceIds.map(getServiceName).join(', ')}
                      </p>
                    </div>
                    <p className="text-sm">{getStaffName(appt.staffId)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">
                  No upcoming appointments today.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="flex h-full flex-col justify-between">
          <CardHeader>
            <CardTitle>Full Calendar</CardTitle>
            <CardDescription>
              View and manage all appointments for the day, week, or month.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="flex h-full items-center justify-center rounded-lg bg-accent p-8">
              <Calendar className="h-16 w-16 text-primary" />
            </div>
          </CardContent>
          <CardContent>
             <Button asChild className="w-full">
                <Link href="/dashboard/calendar">
                    View Calendar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
