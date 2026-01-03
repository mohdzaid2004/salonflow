'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Appointment, Service } from '@/lib/data';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];


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
      where('status', '==', 'completed')
    );
  }, [salonId, firestore]);

  const servicesQuery = useMemoFirebase(() => {
    if (!salonId || !firestore) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [salonId, firestore]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesQuery);

  const todaysAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(appt => {
      if (!appt.date) return false; // FIX: Ensure date exists
      const apptDate = (appt.date as Timestamp).toDate();
      return apptDate >= todayTimestamp.toDate() && apptDate < tomorrowTimestamp.toDate();
    });
  }, [appointments, todayTimestamp, tomorrowTimestamp]);

  const todaysStats = useMemo(() => {
    if (!todaysAppointments || !services) {
      return { totalRevenue: 0, completedAppointments: 0 };
    }
    const completedAppointments = todaysAppointments.length;
    const totalRevenue = todaysAppointments.reduce((acc, appt) => acc + appt.amountPaid, 0);
    return { totalRevenue, completedAppointments };
  }, [todaysAppointments, services]);
  
  const revenueByService = useMemo(() => {
    if (!appointments || !services) return [];
    
    const serviceMap = new Map(services.map(s => [s.id, { name: s.name, price: s.price }]));
    const revenueMap = new Map<string, number>();

    appointments.forEach(appt => {
      if (appt.serviceIds) { // FIX: Ensure serviceIds exists
        appt.serviceIds.forEach(serviceId => {
            const service = serviceMap.get(serviceId);
            if (service) {
            const currentRevenue = revenueMap.get(service.name) || 0;
            // We use the actual amountPaid for the appointment divided by number of services
            // as a proxy if price isn't stored per service in appointment.
            // A more accurate way would be to store price per service at time of booking.
            const serviceRevenue = appt.amountPaid / appt.serviceIds.length;
            revenueMap.set(service.name, currentRevenue + serviceRevenue);
            }
        });
      }
    });

    return Array.from(revenueMap.entries()).map(([name, value]) => ({ name, value }));

  }, [appointments, services]);


  const isLoading = isUserLoading || isLoadingAppointments || isLoadingServices;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderSkeleton = () => (
    <>
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
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue by Service</CardTitle>
          <CardDescription>
            A breakdown of your salon's revenue streams.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </>
  )

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      {isLoading ? renderSkeleton() : (
      <>
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
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Revenue by Service</CardTitle>
                <CardDescription>All-time revenue from completed appointments.</CardDescription>
            </CardHeader>
            <CardContent>
                {revenueByService.length > 0 ? (
                <ChartContainer config={{}} className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Tooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                hideLabel
                                formatter={(value) => formatCurrency(value as number)}
                            />}
                        />
                        <Pie
                            data={revenueByService}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={50}
                            paddingAngle={5}
                            labelLine={false}
                        >
                            {revenueByService.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                 ) : (
                <div className="flex h-48 w-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">No revenue data available yet.</p>
                </div>
              )}
            </CardContent>
        </Card>
      </>
      )}
    </div>
  );
}
