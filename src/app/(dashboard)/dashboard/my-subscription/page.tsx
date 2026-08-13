'use client';

import { useMemo, useTransition, useState, useEffect } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Check, Calendar, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const subscriptionPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Essential tools for individual stylists and local boutique salons.',
    price: 499,
    features: [
      'Up to 3 Staff Members',
      'Unlimited Appointments',
      'Basic Billing Suite',
      'WhatsApp Notifications',
      'Customer Feedback & Ratings',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced capabilities for growing salons with multiple teams.',
    price: 999,
    isPopular: true,
    features: [
      'Everything in Starter, plus:',
      'Unlimited Staff Members',
      'Full Billing & GST Invoices',
      'Automated WhatsApp Campaigns',
      'Detailed Business Insights & Analytics',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Enterprise-grade features for premium multi-location salon chains.',
    price: 1999,
    features: [
      'Everything in Professional, plus:',
      'Multi-Location Dashboard (Sync)',
      'Full Payroll & Inventory Suites',
      'Dedicated Custom WhatsApp API Number',
      'VIP Loyalty & Custom Promotion Engine',
    ],
  },
];

// Helper to inject Razorpay Checkout script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function MySubscriptionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [awaitingWebhook, setAwaitingWebhook] = useState(false);

  const salonId = user?.uid;

  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId, isUserLoading]);

  const { data: salon, isLoading } = useDoc<Salon>(salonDocRef);

  const currentPlan = useMemo(() => {
    if (!salon) return null;
    return subscriptionPlans.find(p => p.id === salon.subscriptionPlanId);
  }, [salon]);

  const trialEndsAt = salon?.trialEndsAt ? (salon.trialEndsAt as Timestamp).toDate() : null;
  const daysRemainingInTrial = useMemo(() => {
    if (!trialEndsAt) return 0;
    return differenceInDays(trialEndsAt, new Date());
  }, [trialEndsAt]);

  const handleStartSubscription = async (planId: string) => {
    if (!user || !salonId) return;
    setIsCheckoutLoading(true);

    try {
      // 1. Get Firebase ID token for secure API call
      const idToken = await user.getIdToken();

      // 2. Call backend to create Razorpay Subscription
      const subRes = await fetch('/api/razorpay/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ planId, salonId })
      });

      const subData = await subRes.json();
      if (!subRes.ok || !subData.success) {
        throw new Error(subData.error || 'Failed to initialize subscription checkout.');
      }

      // 3. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please verify your connection.');
      }

      // 4. Open Razorpay Checkout modal
      const options = {
        key: subData.keyId,
        subscription_id: subData.subscriptionId,
        name: 'SalonFlow',
        description: `Recurring ${planId.toUpperCase()} Plan Subscription`,
        image: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/salon-hairdresser-beauty-spa-shop-building-store-28148.png',
        handler: function (response: any) {
          console.log('[Razorpay Client] Checkout Authorized:', response);
          setAwaitingWebhook(true);
          toast({
            title: 'Authorization Successful!',
            description: 'Verifying recurring payment setup. Features will unlock momentarily.',
          });
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
          contact: salon?.phone || ''
        },
        theme: {
          color: '275 100% 25.3%'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error('[Checkout Error]', err);
      toast({
        variant: 'destructive',
        title: 'Checkout Failed',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleUpdatePlan = async (newPlanId: string) => {
    if (!user || !salonId) return;
    startTransition(async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/razorpay/subscription/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            action: 'change_plan',
            planId: newPlanId,
            salonId
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to modify subscription.');
        }

        toast({
          title: 'Plan Updated Successfully!',
          description: data.message,
        });

      } catch (err: any) {
        console.error('[Update Plan Error]', err);
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: err.message || 'Could not update your plan.',
        });
      }
    });
  };

  const handleCancelSubscription = async () => {
    if (!user || !salonId) return;
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to paid features at the end of your billing cycle.')) return;

    startTransition(async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/razorpay/subscription/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            action: 'cancel',
            salonId
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to process cancellation.');
        }

        toast({
          title: 'Cancellation Scheduled',
          description: 'Your subscription cancellation has been configured. Access remains active until billing cycle end.',
        });

      } catch (err: any) {
        console.error('[Cancel Error]', err);
        toast({
          variant: 'destructive',
          title: 'Cancellation Failed',
          description: err.message || 'Could not cancel subscription.',
        });
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const renderSkeleton = () => (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-8 md:grid-cols-3">
        <Card><CardHeader><Skeleton className="h-32 w-full" /></CardHeader></Card>
        <Card><CardHeader><Skeleton className="h-32 w-full" /></CardHeader></Card>
        <Card><CardHeader><Skeleton className="h-32 w-full" /></CardHeader></Card>
      </div>
    </div>
  );

  if (isLoading || isUserLoading) {
    return <div className="grid flex-1 items-start gap-4 md:gap-8">{renderSkeleton()}</div>;
  }

  if (!salon) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Could not retrieve subscription settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isSubscribed = salon.billingStatus === 'active';
  const hasTrial = salon.billingStatus === 'trialing';

  // Automatically reset waiting loader state if webhook fires and unlocks status
  if (awaitingWebhook && isSubscribed) {
    setAwaitingWebhook(false);
  }

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      {/* 1. Webhook Awaiting Overlay State */}
      {awaitingWebhook && (
        <Card className="border-purple-600 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
            <h3 className="text-xl font-bold">Verifying Subscription</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Your recurring authorization is complete! We are waiting for Razorpay secure webhooks to activate your dashboard. Do not close this page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 2. Current Subscription Status Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Billing & Subscriptions</CardTitle>
              <CardDescription>Configure pricing schedules, payment profiles, and invoices.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasTrial && trialEndsAt && (
                <Badge variant={daysRemainingInTrial > 3 ? "secondary" : "destructive"}>
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  {daysRemainingInTrial > 0 ? `${daysRemainingInTrial} Days Trial Remaining` : 'Trial Period Expired'}
                </Badge>
              )}
              {isSubscribed && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700">
                  Active Subscriber
                </Badge>
              )}
              {!isSubscribed && !hasTrial && (
                <Badge variant="destructive">
                  Inactive / Locked
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 rounded-lg border p-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold text-primary">
                {isSubscribed && currentPlan ? `${currentPlan.name} Plan` : 'Free Trial Period'}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {isSubscribed && currentPlan 
                  ? currentPlan.description 
                  : 'Full unrestricted sandbox access to test appointments, WhatsApp logs, and feedback loops.'}
              </p>
              {isSubscribed && currentPlan && (
                <ul className="mt-6 space-y-3">
                  {currentPlan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col justify-between rounded-md bg-accent/50 p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount Period</p>
                <p className="text-3xl font-bold mt-1">
                  {isSubscribed && currentPlan ? <><span className="font-sans">₹</span>{formatCurrency(currentPlan.price)}</> : 'Free'}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                {!!salon.nextBillingDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Next billing: {format((salon.nextBillingDate as any).toDate(), 'dd MMM yyyy')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 mt-6">
                {isSubscribed && (
                  <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10" onClick={handleCancelSubscription} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cancel Subscription
                  </Button>
                )}
                {!isSubscribed && (
                  <Button className="w-full" disabled>
                    No Active Billing
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Available Plans Options Pricing Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          {isSubscribed ? 'Change your Subscription Tier' : 'Upgrade your Plan'}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {subscriptionPlans.map((plan) => {
            const isCurrent = salon.subscriptionPlanId === plan.id;
            const isUpgrade = currentPlan && plan.price > currentPlan.price;

            return (
              <Card key={plan.id} className={`flex flex-col justify-between ${plan.isPopular ? 'border-purple-600 shadow-md relative' : ''}`}>
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 hover:bg-purple-700">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="min-h-10 mt-1">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold"><span className="font-sans">₹</span>{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <ul className="space-y-2 text-sm pt-4 border-t">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-purple-600 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isSubscribed ? (
                    isCurrent ? (
                      <Button className="w-full" variant="secondary" disabled>Current Plan</Button>
                    ) : (
                      <Button className="w-full" onClick={() => handleUpdatePlan(plan.id)} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUpgrade ? 'Upgrade' : 'Downgrade'} to {plan.name}
                      </Button>
                    )
                  ) : (
                    <Button 
                      className={`w-full ${plan.isPopular ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => handleStartSubscription(plan.id)}
                      disabled={isCheckoutLoading}
                    >
                      {isCheckoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isCheckoutLoading ? 'Creating subscription...' : 'Start Subscription'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
