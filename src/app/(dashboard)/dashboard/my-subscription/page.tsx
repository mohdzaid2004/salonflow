'use client';

import { useMemo, useTransition, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Simplified subscription plan structure
const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Trial',
    description: 'Your 15-day free trial to explore all features.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    quarterlyPrice: 0,
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
    quarterlyPrice: 1599, // ~11% discount
    yearlyPrice: 5990, // ~17% discount (2 months free)
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

const pricingTiers = [
    { id: 'monthly', name: 'Monthly', price: 599, period: 'per month', discount: '' },
    { id: 'quarterly', name: 'Quarterly', price: 1599, period: 'per quarter', discount: 'Save ~11%' },
    { id: 'annually', name: 'Annually', price: 5990, period: 'per year', discount: 'Save 17% (2 Months Free)' },
];


export default function MySubscriptionPage({}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly');

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
      description: "In a real app, this would redirect to a billing portal like Razorpay or Stripe.",
      duration: 5000,
    });
  };

  const handlePlanChange = (planId: string, billingCycle: string) => {
    if (!salonDocRef) return;

    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, { 
            subscriptionPlanId: planId,
            ...(salon?.billingStatus === 'trialing' && { billingStatus: 'active' })
        });
        toast({
          title: 'Plan Updated!',
          description: `You have successfully switched to the Premium (${billingCycle}) plan.`,
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
             <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>Could not load subscription details.</CardDescription>
                </CardHeader>
             </Card>
        </div>
    );
  }
  
  const premiumPlan = subscriptionPlans.find(p => p.id === 'premium');

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
                        <Button className="w-full" onClick={handleManageBilling} disabled={isPending || salon.billingStatus === 'trialing'}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Manage Billing
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        {currentPlan.id === 'starter' && premiumPlan && (
            <div className="mt-4">
                <h2 className="mb-4 text-xl font-bold">Upgrade to Premium</h2>
                 <Card className="border-primary">
                    <CardHeader>
                        <CardTitle className="font-headline">{premiumPlan.name}</CardTitle>
                        <CardDescription>{premiumPlan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue={selectedBillingCycle} onValueChange={setSelectedBillingCycle} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                                <TabsTrigger value="annually">Annually</TabsTrigger>
                            </TabsList>
                            {pricingTiers.map(tier => (
                                <TabsContent key={tier.id} value={tier.id}>
                                    <div className="mt-4 rounded-lg border p-4">
                                        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-bold"><span className='font-arial'>₹</span>{formatCurrency(tier.price)}</span>
                                                    <span className="text-muted-foreground">{tier.period}</span>
                                                </div>
                                                {tier.discount && <Badge variant="secondary" className='mt-2'>{tier.discount}</Badge>}
                                            </div>
                                             <Button 
                                                className="w-full sm:w-auto"
                                                onClick={() => handlePlanChange('premium', tier.name)}
                                                disabled={isPending}
                                            >
                                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Upgrade to {tier.name}
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                        <ul className="mt-6 space-y-2 text-sm">
                            {premiumPlan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-primary" />
                                <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
}
