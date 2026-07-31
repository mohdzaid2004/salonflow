'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where, Timestamp } from 'firebase/firestore';
import type { Customer, Salon, Appointment, Staff } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Cake, Star, Calendar, IndianRupee, User as StaffIcon } from 'lucide-react';

export default function CustomerDetailClient() {
  const { id: customerId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();

  const salonId = user?.uid;

  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const customerDocRef = useMemo(() => {
    if (!firestore || !salonId || !customerId) return null;
    return doc(
      firestore,
      `salons/${salonId}/customers`,
      customerId as string
    );
  }, [firestore, salonId, customerId]);
  
  const appointmentsQuery = useMemo(() => {
    if (!firestore || !salonId || !customerId) return null;
    return query(
        collection(firestore, `salons/${salonId}/appointments`),
        where('customerId', '==', customerId as string)
    );
  }, [firestore, salonId, customerId]);

  const staffQuery = useMemo(() => {
      if (!firestore || !salonId) return null;
      return collection(firestore, `salons/${salonId}/staff`);
  }, [firestore, salonId]);

  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);
  const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerDocRef);
  const { data: appointments, isLoading: isAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);
  const { data: staff, isLoading: isStaffLoading } = useCollection<Staff>(staffQuery);
  
  const isLoading = isSalonLoading || isCustomerLoading || isAppointmentsLoading || isStaffLoading;

  const staffMap = useMemo(() => {
      if (!staff) return new Map();
      return new Map(staff.map(s => [s.id, s.name]));
  }, [staff]);

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const formatDate = (date: unknown) => {
    if (!date) return 'N/A';
    
    const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date as any);
    
    if (isNaN(dateObj.getTime())) {
        return "N/A";
    }

    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Customer Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested customer could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid flex-1 items-start gap-4">
      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0 border-b pb-6">
          <Avatar className="h-16 w-16 text-2xl">
            <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{customer.name}</CardTitle>
            <CardDescription>
              Customer Profile & History
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-8 pt-6 md:grid-cols-3">
           <div className="space-y-4 md:col-span-1">
                <h3 className="font-semibold text-lg">Customer Details</h3>
                <div className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <a href={`tel:${customer.phone}`} className="font-medium hover:underline">
                        {customer.phone}
                    </a>
                </div>
                <div className="flex items-center gap-4">
                    <Cake className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Birthday:</span>
                    <span className="font-medium">{formatDate(customer.dob)}</span>
                </div>
                {salon?.loyaltyProgramEnabled && (
                  <div className="flex items-center gap-4">
                      <Star className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">Loyalty Points:</span>
                      <span className="font-medium">{customer.loyaltyPoints || 0}</span>
                  </div>
                )}
           </div>
            <div className="md:col-span-2 space-y-4">
                <h3 className="font-semibold text-lg">Visit History</h3>
                {isAppointmentsLoading || isStaffLoading ? (
                    <div className="rounded-lg border p-4"><Skeleton className="h-24 w-full" /></div>
                ) : appointments && appointments.length > 0 ? (
                    <div className="rounded-lg border">
                        <ul className="divide-y divide-border">
                            {appointments.sort((a,b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis()).map(appt => (
                                <li key={appt.id} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{formatDate(appt.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StaffIcon className="h-4 w-4 text-muted-foreground" />
                                        <span>{staffMap.get(appt.staffId) || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:justify-end">
                                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold">{formatCurrency(appt.amountPaid)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                     <div className="rounded-lg border p-8 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">No visit history found for this customer.</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
