'use client';
import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Appointment, Customer, Staff } from '@/lib/data';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee } from 'lucide-react';

export default function OverviewPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    // This runs on the client, ensuring `new Date()` is correct.
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    setDateRange({ start, end });
  }, []);

  const salonId = user?.uid;

  const completedAppointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !salonId || !dateRange) return null;
    return query(
      collection(firestore, `salons/${salonId}/appointments`),
      where('status', '==', 'completed'),
      where('dateTime', '>=', Timestamp.fromDate(dateRange.start)),
      where('dateTime', '<=', Timestamp.fromDate(dateRange.end)),
      orderBy('dateTime', 'desc')
    );
  }, [firestore, salonId, dateRange]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);

  const { data: appointments, isLoading: appointmentsLoading } = useCollection<Appointment>(completedAppointmentsQuery);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: staff, isLoading: staffLoading } = useCollection<Staff>(staffQuery);

  const isLoading = isUserLoading || appointmentsLoading || customersLoading || staffLoading;

  const todaysRevenue = useMemo(() => {
    if (!appointments) return 0;
    return appointments.reduce((total, appt) => total + appt.totalAmount, 0);
  }, [appointments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };
  
  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8 lg:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Today&apos;s Revenue</CardDescription>
                    <CardTitle className="text-4xl">
                        {isLoading ? <Skeleton className="h-10 w-40" /> : formatCurrency(todaysRevenue)}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                        Total from {appointments?.length || 0} completed appointments today.
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Appointments Today</CardDescription>
                    <CardTitle className="text-4xl">
                         {isLoading ? <Skeleton className="h-10 w-20" /> : appointments?.length || '0'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-xs text-muted-foreground">
                        Number of completed check-outs.
                    </div>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Welcome to your Dashboard</CardTitle>
                <CardDescription>
                    This is your starting point. You can customize this overview page with key metrics.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>You can now begin to build out your features on this stable foundation.</p>
            </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card>
            <CardHeader>
                <CardTitle>Recent Check-outs</CardTitle>
                <CardDescription>Today&apos;s completed appointments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-5 w-16" />
                        </div>
                    ))
                ) : appointments && appointments.length > 0 ? (
                    appointments.slice(0, 5).map(appt => {
                        const customer = customers?.find(c => c.id === appt.customerId);
                        const staffMember = staff?.find(s => s.id === appt.staffId);
                        return (
                            <div key={appt.id} className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>{getInitials(customer?.name || '?')}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">{customer?.name || 'Unknown Customer'}</p>
                                    <p className="text-sm text-muted-foreground">with {staffMember?.name || 'Unknown Staff'}</p>
                                </div>
                                <div className="ml-auto font-medium">{formatCurrency(appt.totalAmount)}</div>
                            </div>
                        )
                    })
                ) : (
                     <p className="text-sm text-center py-8 text-muted-foreground">No check-outs have been completed today.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
