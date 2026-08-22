'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, Timestamp, addDoc, updateDoc, query, where, getDocs, limit } from 'firebase/firestore';
import type { Appointment, Salon, Staff, Review } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, CheckCircle2, Heart, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { useParams } from 'next/navigation';

type PageStatus = 'loading' | 'loaded' | 'invalid' | 'submitted' | 'already-submitted';

const FEEDBACK_TAGS = [
  'Great Service',
  'Friendly Staff',
  'Clean & Sanitized',
  'Good Value',
  'Loved the Styling',
  'Relaxing Ambiance'
];

export default function FeedbackClient() {
  const params = useParams();
  const compositeIdFromParams = params.appointmentId;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [status, setStatus] = useState<PageStatus>('loading');
  const [appointment, setAppointment] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Great Service']);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!compositeId || compositeId === 'placeholder') return ['default', 'appt'];
    try {
      const decodedId = decodeURIComponent(compositeId);
      const parts = decodedId.split('_');
      return parts.length >= 2 ? [parts[0], parts.slice(1).join('_')] : [parts[0], parts[0]];
    } catch (e) {
      return ['default', 'appt'];
    }
  }, [compositeId]);

  useEffect(() => {
    if (!firestore) return;
    
    const fetchData = async () => {
      setStatus('loading');
      try {
        if (salonId && appointmentId && salonId !== 'default') {
          const appointmentDocRef = doc(firestore, `salons/${salonId}/appointments`, appointmentId);
          const appointmentSnap = await getDoc(appointmentDocRef);

          if (appointmentSnap.exists()) {
            setAppointment({ id: appointmentSnap.id, ...appointmentSnap.data() });
          }

          const salonDocRef = doc(firestore, 'salons', salonId);
          const salonSnap = await getDoc(salonDocRef);
          if (salonSnap.exists()) {
            setSalon({ id: salonSnap.id, ...salonSnap.data() });
          } else {
            setSalon({ name: 'SalonFlow' });
          }
        } else {
          setSalon({ name: 'SalonFlow' });
        }
        setStatus('loaded');
      } catch (error) {
        setSalon({ name: 'SalonFlow' });
        setStatus('loaded');
      }
    };

    fetchData();
  }, [firestore, salonId, appointmentId]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating required',
        description: 'Please select a star rating before submitting.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (firestore && salonId && salonId !== 'default') {
        const reviewData = {
          salonId,
          appointmentId: appointmentId || 'direct',
          customerName: appointment?.customer || appointment?.customerName || 'Verified Client',
          stylist: appointment?.stylist || 'Stylist',
          service: appointment?.service || 'Salon Service',
          rating,
          comment,
          tags: selectedTags,
          createdAt: Timestamp.now(),
        };
        
        const reviewsRef = collection(firestore, `salons/${salonId}/reviews`);
        await addDoc(reviewsRef, reviewData);

        if (appointmentId) {
          try {
            const apptRef = doc(firestore, `salons/${salonId}/appointments/${appointmentId}`);
            await updateDoc(apptRef, {
              feedbackSubmitted: true,
              feedbackRating: rating,
              feedbackSubmittedAt: Timestamp.now()
            });
          } catch (e) {
            // non-fatal
          }
        }
      }
      
      setStatus('submitted');
    } catch (error) {
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9FD] px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 animate-pulse">
            <Logo className="h-6 w-6 text-purple-700" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Loading Feedback Form...</p>
        </div>
      </div>
    );
  }

  if (status === 'submitted') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9FD] px-4 py-8 select-none">
        <Card className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Thank You!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your feedback for {salon?.name || 'SalonFlow'} has been recorded.
            </p>
          </div>

          {rating >= 4 && (
            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 text-center space-y-2 mt-2">
              <p className="text-xs font-semibold text-purple-950">
                Loved your experience? Help others find us on Google!
              </p>
              <a
                href={salon?.googleReviewUrl || 'https://google.com'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-sm shadow-purple-600/20"
              >
                <span>Write a Google Review</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="pt-2">
            <Button 
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined') window.close();
              }}
              className="w-full h-9 rounded-xl text-xs font-bold"
            >
              Close Window
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9FD] px-4 py-8 select-none font-sans">
      
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
          <Logo className="h-5 w-5 text-purple-700" />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-slate-900">{salon?.name || 'SalonFlow'}</span>
      </div>

      <Card className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
        <CardHeader className="p-0 text-center space-y-1">
          <CardTitle className="text-lg sm:text-xl font-extrabold text-slate-900">
            How was your visit?
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Rate your service experience with {appointment?.stylist ? `${appointment.stylist} at ` : ''}{salon?.name || 'SalonFlow'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-5">
          
          {/* Star Selector */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 text-3xl sm:text-4xl transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={cn(
                    'w-8 h-8 sm:w-9 sm:h-9 transition-colors',
                    star <= rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200 fill-slate-100'
                  )}
                />
              </button>
            ))}
          </div>

          {/* Quick Tags */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block text-center">
              What did you like most?
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold transition-all border',
                      isSelected
                        ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comments Textarea */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Comments or Suggestions (Optional)
            </label>
            <Textarea
              placeholder="Tell us about your haircut, treatment, or stylist experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="rounded-2xl text-xs bg-slate-50 border-slate-200 min-h-[90px] focus:border-purple-600 resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </span>
            ) : (
              'Submit Feedback'
            )}
          </Button>

        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-400 mt-6 text-center">
        Powered by <span className="font-bold text-slate-600">SalonFlow</span> • Safe & Verified Customer Review
      </p>

    </div>
  );
}
