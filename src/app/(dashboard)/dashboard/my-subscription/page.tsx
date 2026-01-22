'use client';

import { useMemo, useTransition } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import type { Salon, SubscriptionPlan } from '@/lib/data';
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
import { Check, Calendar, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// Simplified subscription plan structure
const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Trial',
    description: 'Your 15-day free trial to explore all features.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    staffLimit: -1,
    features: [
      'Unlimited Staff',
      'Unlimited Appointments',
      'Full Billing Suite',
      'WhatsApp Reminders',
      'Customer Feedback',
    ],
    isPopular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'The complete toolkit to run and grow your salon business.',
    monthlyPrice: 599,
    yearlyPrice: 5990,
    staffLimit: -1, // Unlimited
    features: [
      'Everything in Trial, plus:',
      'GST Invoices & Reports',
      'Online Booking Link',
      'Advanced Reports',
    ],
    isPopular: true,
  },
];


export default function MySubscriptionPage({}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const salonId = user?.uid;

  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: salon, isLoading } = useDoc<Salon>(salonDocRef);

  const currentPlan = useMemo(() => {
    return subscriptionPlans.find(p => p.id === (salon?.subscriptionPlanId || 'starter'));
  }, [salon]);

  const trialEndsAt = salon?.trialEndsAt ? (salon.trialEndsAt as Timestamp).toDate() : null;
  const daysRemainingInTrial = trialEndsAt ? differenceInDays(trialEndsAt, new Date()) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const handleManageBilling = () => {
    toast({
      title: "Manage Billing",
      description: "In a real app, this would redirect to a billing portal like Stripe or Razorpay.",
      duration: 5000,
    });
  };

  const handlePlanChange = (planId: string, planName: string) => {
    if (!salonDocRef) return;

    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, { 
            subscriptionPlanId: planId,
            // If user is on trial, upgrading moves them to 'active'
            ...(salon?.billingStatus === 'trialing' && { billingStatus: 'active' })
        });
        toast({
          title: 'Plan Changed!',
          description: `You have successfully switched to the ${planName} plan.`,
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not change your subscription plan. Please try again.',
        });
      }
    });
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
      <div className="grid gap-8 md:grid-cols-2">
        <Card><CardHeader><Skeleton className="h-32 w-full" /></CardHeader></Card>
        <Card><CardHeader><Skeleton className="h-32 w-full" /></CardHeader></Card>
      </div>
    </div>
  );

  if (isLoading) {
    return (
        <div className="grid flex-1 items-start gap-4 md:gap-8">
            {renderSkeleton()}
        </div>
    );
  }

  if (!salon || !currentPlan) {
    return (
        <div className="grid flex-1 items-start gap-4 md:gap-8">
            <p>Could not load subscription details.</p>
        </div>
    );
  }
  
  const otherPlans = subscriptionPlans.filter(p => p.id !== currentPlan.id);

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-2xl">My Subscription</CardTitle>
                        <CardDescription>Manage your plan and billing details.</CardDescription>
                    </div>
                    {salon.billingStatus === 'trialing' && trialEndsAt && (
                         <div className="mt-4 md:mt-0">
                            <Badge variant={daysRemainingInTrial > 3 ? "secondary" : "destructive"}>
                                <Calendar className="mr-2 h-4 w-4" />
                                {daysRemainingInTrial > 0 ? `Trial ends in ${daysRemainingInTrial} day(s)` : 'Trial has ended'}
                            </Badge>
                         </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 rounded-lg border p-6 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <h3 className="text-xl font-bold text-primary">{currentPlan.name} Plan</h3>
                        <p className="mt-2 text-muted-foreground">{currentPlan.description}</p>
                        <ul className="mt-6 space-y-3">
                            {currentPlan.features.map(feature => (
                                <li key={feature} className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-green-500" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex flex-col justify-between rounded-md bg-accent/50 p-6">
                        <div>
                             <p className="text-sm font-medium text-muted-foreground">
                                {salon.billingStatus === 'trialing' ? 'Trial Period' : 'Current Plan'}
                             </p>
                             <p className="text-4xl font-bold">
                                {salon.billingStatus === 'trialing' ? 'Free' : <><span className='font-arial'>₹</span>{formatCurrency(currentPlan.monthlyPrice)}</>}
                                <span className="text-lg font-normal text-muted-foreground">/month</span>
                             </p>
                        </div>
                        <Button className="w-full" onClick={handleManageBilling} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Manage Billing
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        {otherPlans.length > 0 && (
            <div className="mt-4">
                <h2 className="mb-4 text-xl font-bold">Upgrade Your Plan</h2>
                <div className="grid gap-8 md:grid-cols-2">
                    {otherPlans.map(plan => (
                        <Card key={plan.id} className={plan.isPopular ? 'border-primary' : ''}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="font-headline">{plan.name}</CardTitle>
                                    {plan.isPopular && <Badge>Most Popular</Badge>}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold"><span className='font-arial'>₹</span>{formatCurrency(plan.monthlyPrice)}</span>
                                    <span className="text-muted-foreground">/ month</span>
                                </div>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    className="w-full" 
                                    variant={plan.isPopular ? 'default' : 'outline'}
                                    onClick={() => handlePlanChange(plan.id, plan.name)}
                                    disabled={isPending}
                                >
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {plan.monthlyPrice > currentPlan.monthlyPrice ? 'Upgrade' : 'Downgrade'}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}
