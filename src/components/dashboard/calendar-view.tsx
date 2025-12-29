'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Appointment, Customer, Service, Staff } from '@/lib/data';
import { Skeleton } from '../ui/skeleton';

export function CalendarView() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // This assumes the user's document is in a top-level `users` collection.
    // Adjust if your user profiles are stored elsewhere.
    // We need to find the user's salonId.
    // A common pattern is to have a /users/{userId} document with their salonId.
    // For this app, the user document is nested under the salon.
    // We can't know the salonId from just the user.uid.
    // This is a known issue with the current data model. We'll use a hardcoded salonId for now.
    // The salonId should have been stored on the user's custom claims or in a /users/{uid} doc.
    return null; // Can't query user profile effectively yet.
  }, [firestore, user]);

  // FIXME: This is a temporary solution. The salon ID should be retrieved
  // from the authenticated user's profile or custom claims.
  const salonId = user?.uid;

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/appointments`));
  }, [firestore, salonId]);
  
  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);

  const servicesQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);

  const { data: appointments, isLoading: appointmentsLoading } = useCollection<Appointment>(appointmentsQuery);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: staff, isLoading: staffLoading } = useCollection<Staff>(staffQuery);
  const { data: services, isLoading: servicesLoading } = useCollection<Service>(servicesQuery);

  const isLoading = appointmentsLoading || customersLoading || staffLoading || servicesLoading;

  const todayAppointments = useMemo(() => {
    if (!appointments) return [];
    
    const realAppointments = appointments?.map(appt => ({
        ...appt, 
        dateTime: (appt.dateTime as any)?.toDate ? (appt.dateTime as any).toDate() : new Date(appt.dateTime)
    })) || [];
    
    return realAppointments
      .filter(
        (appt) =>
          new Date(appt.dateTime).toDateString() === new Date().toDateString()
      )
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [appointments]);


  const getAppointmentDetails = (appt: Appointment) => {
    const customer = customers?.find((c) => c.id === appt.customerId);
    const staffMember = staff?.find((s) => s.id === appt.staffId);
    const apptServices = services?.filter((s) => appt.serviceIds.includes(s.id)) || [];
    return { customer, staffMember, apptServices };
  };
  
  const renderSkeleton = () => (
     <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-4">
                <div className="w-20 text-right text-sm">
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <div className="relative w-full">
                    <div className="absolute left-0 top-1 h-full w-0.5 bg-border"></div>
                    <Card className="ml-4">
                        <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Skeleton className="h-5 w-24 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-6 w-20" />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        ))}
     </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Appointments</CardTitle>
        <CardDescription>{format(new Date(), 'eeee, MMMM do')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? renderSkeleton() : 
        todayAppointments.length > 0 ? (
          <div className="space-y-4">
            {todayAppointments.map((appt) => {
              const { customer, staffMember, apptServices } = getAppointmentDetails(appt);
              if (!customer || !staffMember) return null; // Don't render if details are missing

              const totalDuration = apptServices.reduce((acc, s) => acc + s.duration, 0);
              const endTime = new Date(appt.dateTime.getTime() + totalDuration * 60000);

              return (
                <div key={appt.id} className="flex gap-4">
                  <div className="w-20 text-right text-sm text-muted-foreground">
                    <p>{format(appt.dateTime, 'h:mm a')}</p>
                    <p className="text-xs">
                        {format(endTime, 'h:mm a')}
                    </p>
                  </div>
                  <div className="relative w-full">
                    <div className="absolute left-0 top-1 h-full w-0.5 bg-border"></div>
                     <Card className={cn("ml-4", {
                        'bg-accent': appt.status === 'booked',
                        'bg-secondary': appt.status === 'completed',
                     })}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{customer?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              with {staffMember?.name}
                            </p>
                          </div>
                           <Badge variant={appt.status === 'completed' ? 'secondary' : 'default'} className="capitalize">{appt.status}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {apptServices.map(s => (
                            <Badge key={s.id} variant="outline">{s.name}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">No appointments today</h3>
            <p className="text-sm text-muted-foreground/80">
              Click &quot;New Appointment&quot; to book one.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
