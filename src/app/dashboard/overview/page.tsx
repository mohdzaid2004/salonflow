'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Appointment, Service } from '@/lib/data';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const salonId = user?.uid;

  // Timestamps are now memoized to prevent re-renders
  const { todayTimestamp, tomorrowTimestamp } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      todayTimestamp: Timestamp.fromDate(today),
      tomorrowTimestamp: Timestamp.fromDate(tomorrow),
    };
  }, []);

  const appointmentsQuery = useMemoFirebase(() => {
    if (!salonId || !firestore) return null;
    return query(
      collection(firestore, `salons/${salonId}/appointments`),
      where('date', '>=', todayTimestamp),
      where('date', '<', tomorrowTimestamp)
    );
  }, [salonId, firestore, todayTimestamp, tomorrowTimestamp]);

  const servicesQuery = useMemoFirebase(() => {
    if (!salonId || !firestore) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [salonId, firestore]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesQuery);

  const todaysStats = useMemo(() => {
    if (!appointments || !services) {
      return { totalRevenue: 0, completedAppointments: 0 };
    }

    const servicesMap = new Map(services.map((s) => [s.id, s.price]));
    let totalRevenue = 0;
    let completedAppointments = 0;

    appointments.forEach((appt) => {
      if (appt.status === 'completed') {
        completedAppointments++;
        appt.serviceIds.forEach((serviceId) => {
          totalRevenue += servicesMap.get(serviceId) || 0;
        });
      }
    });

    return { totalRevenue, completedAppointments };
  }, [appointments, services]);
  
  const isLoading = isUserLoading || isLoadingAppointments || isLoadingServices;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Today&apos;s Revenue
                </CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Today&apos;s Revenue
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todaysStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
                Based on completed appointments
            </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Appointments</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
              +{todaysStats.completedAppointments}
            </div>
          <p className="text-xs text-muted-foreground">
            Completed today
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
