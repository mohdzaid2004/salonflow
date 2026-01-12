'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Customer, Salon } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Cake, Star } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id: customerId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();

  const salonId = user?.uid;

  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const customerDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId || !customerId) return null;
    return doc(
      firestore,
      `salons/${salonId}/customers`,
      customerId as string
    );
  }, [firestore, salonId, customerId]);

  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);
  const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerDocRef);
  
  const isLoading = isSalonLoading || isCustomerLoading;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <Card>
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <PageHeader />
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
      <PageHeader />
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
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
           <div className="space-y-4">
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
            <div>
                <h3 className="mb-4 font-semibold">Visit History</h3>
                <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">Visit history coming soon.</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    