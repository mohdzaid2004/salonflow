'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Appointment, Service } from '@/lib/data';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CalendarDays, IndianRupee } from 'lucide-react';

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];


export default function OverviewPage({}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const salonId = user?.uid;

  // Timestamps are now memoized to prevent re-renders
  const { monthStartTimestamp, sevenDaysAgoTimestamp } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today, so 6 days back

    return {
      monthStartTimestamp: Timestamp.fromDate(monthStart),
      sevenDaysAgoTimestamp: Timestamp.fromDate(sevenDaysAgo),
    };
  }, []);

  const appointmentsQuery = useMemo(() => {
    if (!salonId || !firestore) return null;
    return query(
      collection(firestore, `salons/${salonId}/appointments`),
      where('status', '==', 'completed')
    );
  }, [salonId, firestore]);

  const servicesQuery = useMemo(() => {
    if (!salonId || !firestore) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [salonId, firestore]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesQuery);

  const todaysAppointments = useMemo(() => {
    if (!appointments) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter(appt => {
      if (!appt.date) return false;
      const apptDate = (appt.date as Timestamp).toDate();
      return apptDate >= today && apptDate < tomorrow;
    });
  }, [appointments]);

  const monthlyAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(appt => {
        if (!appt.date) return false;
        const apptDate = (appt.date as Timestamp).toDate();
        return apptDate >= monthStartTimestamp.toDate();
    });
  }, [appointments, monthStartTimestamp]);

  const todaysStats = useMemo(() => {
    if (!todaysAppointments) {
      return { totalRevenue: 0, completedAppointments: 0 };
    }
    const completedAppointments = todaysAppointments.length;
    const totalRevenue = todaysAppointments.reduce((acc, appt) => acc + appt.amountPaid, 0);
    return { totalRevenue, completedAppointments };
  }, [todaysAppointments]);

  const monthlyStats = useMemo(() => {
    if (!monthlyAppointments) {
        return { totalRevenue: 0 };
    }
    const totalRevenue = monthlyAppointments.reduce((acc, appt) => acc + appt.amountPaid, 0);
    return { totalRevenue };
  }, [monthlyAppointments]);
  
  const revenueByService = useMemo(() => {
    if (!monthlyAppointments || !services || monthlyAppointments.length === 0) return [];
    
    const serviceMap = new Map(services.map(s => [s.id, { name: s.name, price: s.price }]));
    const revenueMap = new Map<string, number>();

    monthlyAppointments.forEach(appt => {
      if (appt.serviceIds && appt.serviceIds.length > 0) {
        const revenuePerService = appt.amountPaid / appt.serviceIds.length;
        appt.serviceIds.forEach(serviceId => {
            const service = serviceMap.get(serviceId);
            if (service) {
              const currentRevenue = revenueMap.get(service.name) || 0;
              revenueMap.set(service.name, currentRevenue + revenuePerService);
            }
        });
      }
    });

    return Array.from(revenueMap.entries()).map(([name, value]) => ({ name, value }));

  }, [monthlyAppointments, services]);
  
  const last7DaysRevenue = useMemo(() => {
    if (!appointments) return [];
    const last7DaysAppointments = appointments.filter(appt => {
      if (!appt.date) return false;
      const apptDate = (appt.date as Timestamp).toDate();
      return apptDate >= sevenDaysAgoTimestamp.toDate();
    });
    
    const revenueByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgoTimestamp.toDate());
        date.setDate(date.getDate() + i);
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric'});
        revenueByDay.set(dateString, 0);
    }
    
    last7DaysAppointments.forEach(appt => {
        if (!appt.date) return;
        const dateString = (appt.date as Timestamp).toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric'});
        const currentRevenue = revenueByDay.get(dateString) || 0;
        revenueByDay.set(dateString, currentRevenue + appt.amountPaid);
    });
    
    return Array.from(revenueByDay.entries()).map(([name, revenue]) => ({ name, revenue }));

  }, [appointments, sevenDaysAgoTimestamp]);

  const currentMonthLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);


  const isLoading = isUserLoading || isLoadingAppointments || isLoadingServices;
  
  const formatCurrency = (amount: number) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
    return <><span className="font-arial">₹</span>{formattedAmount}</>;
  };
  
  const renderSkeleton = () => (
    <>
      <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
              Today's Revenue
          </CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-8 w-3/4" />
          </CardContent>
      </Card>
      <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
              This Month's Revenue
          </CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-8 w-3/4" />
          </CardContent>
      </Card>
      <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Appointments</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-8 w-1/2" />
              <p className="text-xs text-muted-foreground">
                Completed today
              </p>
          </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Revenue by Service</CardTitle>
           <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="pt-0">
           <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Last 7 Days Revenue</CardTitle>
        </CardHeader>
        <CardContent>
           <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    </>
  )

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-6">
      {isLoading ? renderSkeleton() : (
      <>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todaysStats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month's Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthlyStats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
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
        <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
                <CardTitle>Revenue by Service</CardTitle>
                 <CardDescription>
                  {currentMonthLabel}
                 </CardDescription>
            </CardHeader>
            <CardContent className="relative h-72 pt-0">
                {revenueByService.length > 0 ? (
                <div className="absolute inset-0">
                <ChartContainer config={{}} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                formatter={(value, name) => (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{name}</span>
                                        <span className="text-muted-foreground">{formatCurrency(value as number)}</span>
                                    </div>
                                )}
                            />}
                        />
                        <Pie
                            data={revenueByService}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={60}
                            paddingAngle={2}
                            labelLine={false}
                        >
                            {revenueByService.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-current text-lg font-bold"
                        >
                          {formatCurrency(monthlyStats.totalRevenue)}
                        </text>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                </div>
                 ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">No revenue data for this month yet.</p>
                </div>
              )}
            </CardContent>
        </Card>
         <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
                <CardTitle>Last 7 Days Revenue</CardTitle>
                <CardDescription>
                    A bar graph showing total revenue per day for the last week.
                </CardDescription>
            </CardHeader>
            <CardContent className="relative h-72">
                {last7DaysRevenue.length > 0 ? (
                <div className="absolute inset-0">
                <ChartContainer config={{}} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={last7DaysRevenue}>
                         <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                formatter={(value) => formatCurrency(value as number)}
                            />}
                        />
                         <XAxis 
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                         />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                </div>
                 ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">Not enough data for the last 7 days.</p>
                </div>
              )}
            </CardContent>
        </Card>
      </>
      )}
    </div>
  );
}
