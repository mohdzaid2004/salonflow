'use client';

import type { Salon } from '@/lib/data';
import { differenceInDays, isPast } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { AlertCircle, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function SubscriptionBanner({ salon }: { salon: Salon | null }) {
  if (!salon || salon.billingStatus !== 'trialing' || !salon.trialEndsAt) {
    return null;
  }

  const trialEndsDate = (salon.trialEndsAt as Timestamp).toDate();
  const hasTrialExpired = isPast(trialEndsDate);

  if (hasTrialExpired) {
    return (
      <div className="flex items-center justify-center gap-4 bg-destructive p-3 text-center text-sm text-destructive-foreground">
        <AlertCircle className="h-5 w-5" />
        <p>
          Your free trial has expired. Please upgrade to continue using SalonFlow.
        </p>
        <Button variant="secondary" size="sm" asChild className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90">
          <Link href="/dashboard/billing">Upgrade Now</Link>
        </Button>
      </div>
    );
  }

  const daysRemaining = differenceInDays(trialEndsDate, new Date());

  if (daysRemaining <= 7) {
    let remainingMessage;
    if (daysRemaining <= 0) {
      remainingMessage = 'Your free trial ends today.';
    } else {
      remainingMessage = `Your free trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`;
    }
    
    return (
      <div className="flex items-center justify-center gap-4 border-b border-primary/30 bg-primary/20 p-3 text-center text-sm">
        <PartyPopper className="h-5 w-5 text-primary" />
        <p className="text-primary">{remainingMessage} Upgrade now to keep your access.</p>
        <Button variant="default" size="sm" asChild>
          <Link href="/dashboard/billing">Upgrade</Link>
        </Button>
      </div>
    );
  }

  return null;
}
