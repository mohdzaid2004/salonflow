'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, Timestamp, addDoc } from 'firebase/firestore';
import type { Appointment, Salon, Staff, Review } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';

export default function FeedbackPage() {
  const { appointmentId: compositeId } = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Safely extract IDs from the composite key
  const [salonId, appointmentId] = useMemo(() => {
    const id = Array.isArray(compositeId) ? compositeId[0] : compositeId;
    if (!id) return [null, null];
    const parts = id.split('_');
    return parts.length === 2 ? [parts[0], parts[1]] : [null, null];
  }, [compositeId]);

  const appointmentDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId || !appointmentId) return null;
    return doc(firestore, `salons/${salonId}/appointments`, appointmentId);
  }, [firestore, salonId, appointmentId]);

  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);

  const staffId = appointment?.staffId;
  const salonDocId = appointment?.salonId; // Use salonId from appointment data for consistency

  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonDocId) return null;
    return doc(firestore, 'salons', salonDocId);
  }, [firestore, salonDocId]);

  const staffDocRef = useMemoFirebase(() => {
    if (!firestore || !salonDocId || !staffId) return null;
    return doc(firestore, `salons/${salonDocId}/staff`, staffId);
  }, [firestore, salonDocId, staffId]);

  const { data: salon, isLoading: isLoadingSalon } = useDoc<Salon>(salonDocRef);
  const { data: staff, isLoading: isLoadingStaff } = useDoc<Staff>(staffDocRef);

  // This effect handles the initial loading screen.
  // It waits until the primary data fetching is no longer loading.
  useEffect(() => {
    if (!isLoadingAppointment) {
      setInitialLoading(false);
    }
  }, [isLoadingAppointment]);
  
  const isLoading = initialLoading || (!appointment && !isLoadingAppointment) || (appointment && (isLoadingSalon || isLoadingStaff));

  const getInitials = (name: string) => name ? name.split(' ').map((n) => n[0]).join('') : '';

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating required',
        description: 'Please select a star rating before submitting.',
      });
      return;
    }
    if (!firestore || !salonId || !staffId || !appointment?.customerId || !appointmentId) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not submit review due to missing information.',
      });
      return;
    }

    setIsSubmitting(true);
    const reviewData: Omit<Review, 'id' | 'reviewId'> = {
      salonId,
      staffId,
      customerId: appointment.customerId,
      appointmentId: appointmentId,
      rating,
      comment,
      createdAt: Timestamp.now(),
    };
    
    try {
      const reviewsRef = collection(firestore, `salons/${salonId}/reviews`);
      await addDoc(reviewsRef, reviewData);
      
      toast({
        title: 'Feedback Submitted!',
        description: 'Thank you for helping us improve. This window will now close.',
      });

      setTimeout(() => {
        window.close();
      }, 2000);

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit your review. Please try again.',
      });
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <Skeleton className="mx-auto h-20 w-20 rounded-full" />
            <div className="flex justify-center space-x-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-8" />
              ))}
            </div>
            <Skeleton className="h-24 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!appointment || !salon || !staff) {
    return (
       <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>The feedback link is invalid or has expired.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Logo className="h-8 w-8 text-primary" />
        <span className="font-headline text-2xl font-bold">{salon.name}</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Leave a Review</CardTitle>
          <CardDescription>How was your experience with {staff.name}?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <Avatar className="mx-auto h-20 w-20 text-3xl">
            <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
          </Avatar>

          <div className="flex justify-center space-x-2">
            {[...Array(5)].map((_, i) => {
              const starValue = i + 1;
              return (
                <button
                  key={starValue}
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(starValue)}
                  disabled={isSubmitting}
                >
                  <Star
                    className={cn(
                      'h-8 w-8 cursor-pointer transition-colors',
                      starValue <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              );
            })}
          </div>
          
          <Textarea 
            placeholder={`Tell us more about your experience (optional)`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={isSubmitting}
          />

        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
