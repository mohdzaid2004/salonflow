'use client';

import { useState, useTransition } from 'react';
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
  const { appointmentId } = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isPending, startTransition] = useTransition();

  const appointmentDocRef = useMemoFirebase(() => {
    if (!firestore || !appointmentId) return null;
    const pathSegments = (appointmentId as string).split('_');
    if (pathSegments.length < 2) return null;
    return doc(firestore, `salons/${pathSegments[0]}/appointments`, pathSegments[1]);
  }, [firestore, appointmentId]);

  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);

  const salonId = appointment?.salonId;
  const staffId = appointment?.staffId;

  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const staffDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId || !staffId) return null;
    return doc(firestore, `salons/${salonId}/staff`, staffId);
  }, [firestore, salonId, staffId]);

  const { data: salon, isLoading: isLoadingSalon } = useDoc<Salon>(salonDocRef);
  const { data: staff, isLoading: isLoadingStaff } = useDoc<Staff>(staffDocRef);

  const isLoading = isLoadingAppointment || isLoadingSalon || isLoadingStaff;

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('');

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating required',
        description: 'Please select a star rating before submitting.',
      });
      return;
    }
    if (!salonId || !staffId || !appointment?.customerId || !appointmentId) return;

    startTransition(async () => {
      const reviewData: Omit<Review, 'id'> = {
        salonId,
        staffId,
        customerId: appointment.customerId,
        appointmentId: appointment.id,
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

        // Close the window after a short delay to allow the user to read the toast.
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: 'Could not submit your review. Please try again.',
        });
      }
    });
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
                  disabled={isPending}
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
            disabled={isPending}
          />

        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
