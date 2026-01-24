'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, Timestamp, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type PageStatus = 'loading' | 'loaded' | 'invalid' | 'submitted' | 'already-submitted';

export default function FeedbackPage({ params }: { params: { appointmentId: string } }) {
  const compositeIdFromParams = params.appointmentId;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [status, setStatus] = useState<PageStatus>('loading');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [salonId, appointmentId] = useMemo(() => {
    if (!compositeIdFromParams) return [null, null];
    try {
      const decodedId = decodeURIComponent(compositeIdFromParams);
      const parts = decodedId.split('_');
      return parts.length === 2 ? [parts[0], parts[1]] : [null, null];
    } catch (e) {
      console.error("Error decoding feedback ID:", e);
      return [null, null];
    }
  }, [compositeIdFromParams]);

  useEffect(() => {
    // 1. Wait for Firestore to be initialized.
    // The initial state is 'loading', which is correct.
    if (!firestore) {
      return;
    }

    // 2. If the IDs couldn't be parsed from the URL, the link is invalid.
    if (!salonId || !appointmentId) {
      setStatus('invalid');
      return;
    }
    
    const fetchData = async () => {
      // Set status to loading here inside async function to handle re-fetches if needed,
      // although with this dependency array, it should only run once.
      setStatus('loading');
      try {
        const reviewsRef = collection(firestore, `salons/${salonId}/reviews`);
        const reviewQuery = query(reviewsRef, where('appointmentId', '==', appointmentId), limit(1));
        const reviewSnapshot = await getDocs(reviewQuery);

        if (!reviewSnapshot.empty) {
          setStatus('already-submitted');
          return;
        }

        const appointmentDocRef = doc(firestore, `salons/${salonId}/appointments`, appointmentId);
        const appointmentSnap = await getDoc(appointmentDocRef);

        if (!appointmentSnap.exists()) {
          setStatus('invalid');
          return;
        }

        const apptData = { id: appointmentSnap.id, ...appointmentSnap.data() } as Appointment;
        setAppointment(apptData);

        const staffId = apptData.staffId;
        const salonDocId = apptData.salonId;
        
        if (!staffId || !salonDocId) {
            setStatus('invalid');
            return;
        }

        const salonDocRef = doc(firestore, 'salons', salonDocId);
        const staffDocRef = doc(firestore, `salons/${salonDocId}/staff`, staffId);

        const [salonSnap, staffSnap] = await Promise.all([
          getDoc(salonDocRef),
          getDoc(staffDocRef)
        ]);

        if (!salonSnap.exists() || !staffSnap.exists()) {
          setStatus('invalid');
          return;
        }

        setSalon({ id: salonSnap.id, ...salonSnap.data() } as Salon);
        setStaff({ id: staffSnap.id, ...staffSnap.data() } as Staff);
        setStatus('loaded');

      } catch (error) {
        console.error("Error fetching feedback data:", error);
        setStatus('invalid');
      }
    };

    fetchData();
  }, [firestore, salonId, appointmentId]);

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
    if (!firestore || !salonId || !appointment?.staffId || !appointment?.customerId || !appointmentId) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not submit review due to missing information.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData: Omit<Review, 'id' | 'reviewId'> & {reviewId?: string} = {
        salonId,
        staffId: appointment.staffId,
        customerId: appointment.customerId,
        appointmentId: appointmentId,
        rating,
        comment,
        createdAt: Timestamp.now(),
      };
      
      const reviewsRef = collection(firestore, `salons/${salonId}/reviews`);
      await addDoc(reviewsRef, reviewData);
      
      setStatus('submitted');
      setTimeout(() => window.close(), 2000);

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
  
  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4 text-center">
             <div className='flex justify-center'>
               <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
             <p className='text-muted-foreground'>Loading Feedback Form...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'invalid') {
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
  
  if (status === 'submitted' || status === 'already-submitted') {
    const title = status === 'submitted' ? 'Thank You!' : 'Feedback Submitted';
    const description = status === 'submitted' 
        ? 'Your feedback has been submitted. This window will close shortly.' 
        : 'You have already submitted feedback for this appointment.';
    
    return (
       <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
           <CardContent>
            <Button onClick={() => window.close()}>Close Now</Button>
           </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'loaded' && salon && staff) {
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

            <RadioGroup
              onValueChange={(value) => setRating(Number(value))}
              className="flex justify-center space-x-2"
              disabled={isSubmitting}
            >
              {[...Array(5)].map((_, i) => {
                const starValue = i + 1;
                return (
                  <div key={starValue} className="flex items-center">
                    <RadioGroupItem
                      value={String(starValue)}
                      id={`rating-${starValue}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`rating-${starValue}`}
                      className="cursor-pointer"
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          starValue <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300 peer-hover:fill-amber-200 peer-hover:text-amber-200'
                        )}
                      />
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            
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

  // Fallback for any unexpected state
  return null;
}
