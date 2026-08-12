'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, Timestamp, addDoc, updateDoc, query, where, getDocs, limit } from 'firebase/firestore';
import type { Appointment, Salon, Staff, Review } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useParams } from 'next/navigation';

type PageStatus = 'loading' | 'loaded' | 'invalid' | 'submitted' | 'already-submitted';

export default function FeedbackClient() {
  const params = useParams();
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
  const [debugError, setDebugError] = useState<string | null>(null);
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
  }, []);

  const compositeId = useMemo(() => {
    if (pathname) {
      const match = pathname.match(/\/feedback\/([^/]+)/);
      if (match && match[1] && match[1] !== 'placeholder') {
        return match[1];
      }
    }
    const paramId = Array.isArray(compositeIdFromParams) ? compositeIdFromParams[0] : compositeIdFromParams;
    return paramId || null;
  }, [pathname, compositeIdFromParams]);

  const [salonId, appointmentId] = useMemo(() => {
    if (!compositeId || compositeId === 'placeholder') return [null, null];
    try {
      const decodedId = decodeURIComponent(compositeId);
      const parts = decodedId.split('_');
      return parts.length >= 2 ? [parts[0], parts.slice(1).join('_')] : [null, null];
    } catch (e) {
      console.error("Error decoding feedback ID:", e);
      return [null, null];
    }
  }, [compositeId]);

  useEffect(() => {
    if (!firestore) {
      return;
    }
    
    const fetchData = async () => {
      if (!salonId || !appointmentId) {
        if (compositeId && compositeId !== 'placeholder') {
          setDebugError(`Invalid composite ID format: "${compositeId}"`);
          setStatus('invalid');
        }
        return;
      }

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
          setDebugError(`Appointment document not found (path: salons/${salonId}/appointments/${appointmentId}). This can happen if the link was generated before security rules were deployed.`);
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
          setDebugError(`Salon or Staff data not found. Salon exists: ${salonSnap.exists()}, Staff exists: ${staffSnap.exists()} (path: salons/${salonId}/staff/${staffId})`);
          setStatus('invalid');
          return;
        }

        setSalon({ id: salonSnap.id, ...salonSnap.data() } as Salon);
        setStaff({ id: staffSnap.id, ...staffSnap.data() } as Staff);
        setStatus('loaded');

      } catch (error: any) {
        console.error("Error fetching feedback data:", error);
        setDebugError(error?.message || String(error));
        setStatus('invalid');
      }
    };

    fetchData();
  }, [firestore, salonId, appointmentId, compositeId]);

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

      // Update the corresponding appointment
      const apptRef = doc(firestore, `salons/${salonId}/appointments/${appointmentId}`);
      await updateDoc(apptRef, {
        feedbackSubmitted: true,
        feedbackRating: rating,
        feedbackSubmittedAt: Timestamp.now()
      });

      // Try updating invoice as well if it already exists
      try {
        const invoiceRef = doc(firestore, `salons/${salonId}/invoices/${appointmentId}`);
        await updateDoc(invoiceRef, {
          feedbackSubmitted: true,
          feedbackRating: rating,
          feedbackSubmittedAt: Timestamp.now()
        });
      } catch (invErr) {
        console.warn("[Feedback] Could not update invoice document (might not exist yet):", invErr);
      }
      
      setStatus('submitted');
      setTimeout(() => {
        window.close();
        setTimeout(() => {
          window.location.href = '/';
        }, 300);
      }, 3000);

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
          {debugError && (
            <CardContent className="pb-6">
              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-900/50 text-left font-mono whitespace-pre-wrap break-all">
                <strong>Diagnostic Info:</strong><br />
                {debugError}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }
  
  if (status === 'submitted' || status === 'already-submitted') {
    const title = status === 'submitted' ? 'Thank You!' : 'Feedback Submitted';
    const description = status === 'submitted' 
        ? 'Your feedback has been submitted successfully. You can safely close this page.' 
        : 'You have already submitted feedback for this appointment. You can safely close this page.';
    
    return (
       <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
           <CardContent>
            <Button onClick={() => {
              window.close();
              setTimeout(() => {
                window.location.href = '/';
              }, 300);
            }}>
              Go to Homepage
            </Button>
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

  return null;
}
