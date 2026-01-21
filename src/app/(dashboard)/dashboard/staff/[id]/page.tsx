'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, Timestamp } from 'firebase/firestore';
import type { Staff, Review, Customer } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Cake, Star, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function StaffDetailPage() {
  const { id: staffId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();

  const salonId = user?.uid;

  const staffDocRef = useMemo(() => {
    if (!firestore || !salonId || !staffId) return null;
    return doc(firestore, `salons/${salonId}/staff`, staffId as string);
  }, [firestore, salonId, staffId]);

  const reviewsQuery = useMemo(() => {
    if (!firestore || !salonId || !staffId) return null;
    return query(
      collection(firestore, `salons/${salonId}/reviews`),
      where('staffId', '==', staffId)
    );
  }, [firestore, salonId, staffId]);
  
  const customersQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);


  const { data: staff, isLoading: isStaffLoading } = useDoc<Staff>(staffDocRef);
  const { data: reviews, isLoading: isReviewsLoading } = useCollection<Review>(reviewsQuery);
  const { data: customers, isLoading: isCustomersLoading } = useCollection<Customer>(customersQuery);

  const isLoading = isStaffLoading || isReviewsLoading || isCustomersLoading;
  
  const customerMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map(c => [c.id, c.name]));
  }, [customers]);

  const { averageRating, reviewCount } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }
    const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      averageRating: totalRating / reviews.length,
      reviewCount: reviews.length,
    };
  }, [reviews]);


  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  
  const formatDate = (date: unknown) => {
    if (!date) return 'N/A';
    
    // If it's a Firebase Timestamp, convert it to a JS Date.
    // Otherwise, assume it's something the Date constructor can handle (like another Date object or a string).
    const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date as any);
    
    if (isNaN(dateObj.getTime())) {
        return "N/A";
    }

    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
  
  const renderStarRating = (rating: number) => {
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <Star 
                    key={i}
                    className={`h-4 w-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    )
  }

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

  if (!staff) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Staff Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested staff member could not be found.</p>
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
            <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{staff.name}</CardTitle>
            <div className='text-sm text-muted-foreground flex items-center gap-4 pt-1'>
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{staff.phone || 'N/A'}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4" />
                    <span>{staff.dob ? formatDate(new Date(staff.dob)) : 'N/A'}</span>
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
            <CardTitle className='text-xl mb-1'>Reviews</CardTitle>
            {reviewCount > 0 ? (
                <div className="flex items-center gap-2 mb-4">
                    {renderStarRating(averageRating)}
                    <span className="font-medium">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">from {reviewCount} reviews</span>
                </div>
            ) : null}

            {reviews && reviews.length > 0 ? (
                <div className="space-y-6">
                    {reviews.sort((a,b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis()).map(review => (
                        <div key={review.id} className="grid grid-cols-12 gap-4">
                            <div className="col-span-1">
                                <Avatar className='h-10 w-10'>
                                    <AvatarFallback>{getInitials(customerMap.get(review.customerId) || 'C')}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="col-span-11">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">{customerMap.get(review.customerId) || 'Anonymous Customer'}</span>
                                    <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                                </div>
                                {renderStarRating(review.rating)}
                                {review.comment && (
                                    <p className="mt-2 text-sm text-muted-foreground bg-accent/50 p-3 rounded-md">{review.comment}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-lg border p-8 text-center">
                    <p className="text-sm text-muted-foreground">This staff member has no reviews yet.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
