'use client';

import { useMemo, useEffect, useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Payment, Appointment } from '@/lib/data';
import { IndianRupee, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [today, setToday] = useState({ start: new Date(), end: new Date() });

  useEffect(() => {
    // useEffect to run on client only to avoid hydration mismatch
    const now = new Date();
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(now.setHours(23, 59, 59, 999));
    setToday({ start, end });
  }, []);


  const salonId = user?.uid;

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(
      collection(firestore, `salons/${salonId}/payments`),
      where('createdAt', '>=', today.start),
      where('createdAt', '<=', today.end)
    );
  }, [firestore, salonId, today]);

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(
        collection(firestore, `salons/${salonId}/appointments`),
        where('dateTime', '>=', today.start),
        where('dateTime', '<=', today.end),
        where('status', '==', 'completed')
    );
  }, [firestore, salonId, today]);

  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
  const { data: completedAppointments, isLoading: appointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  const todaysRevenue = useMemo(() => {
    if (!payments) return 0;
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const isLoading = paymentsLoading || appointmentsLoading;

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <PageHeader title="Today's Overview" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
            ) : (
                <div className="text-2xl font-bold">{formatCurrency(todaysRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total sales from completed checkouts today.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <Skeleton className="h-8 w-1/4" />
             ) : (
                <div className="text-2xl font-bold">{completedAppointments?.length || 0}</div>
             )}
            <p className="text-xs text-muted-foreground">
              Number of appointments marked as completed today.
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Feature</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground/50">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              More daily insights will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p>More detailed reports and analytics will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
