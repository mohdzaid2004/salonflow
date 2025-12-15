import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₹499',
    period: '/ month',
    description: 'For individual stylists or very small salons getting started.',
    features: ['1 Staff Member', 'Unlimited Appointments', 'Basic Billing'],
    isPopular: false,
  },
  {
    name: 'Professional',
    price: '₹999',
    period: '/ month',
    description: 'For growing salons that need more power and automation.',
    features: [
      'Up to 5 Staff',
      'WhatsApp Reminders',
      'GST Invoices & Reports',
    ],
    isPopular: true,
  },
  {
    name: 'Business',
    price: '₹1,499',
    period: '/ month',
    description: 'For large salons that want to unlock their full potential.',
    features: [
      'Unlimited Staff',
      'Online Booking Link',
      'Advanced Reports',
    ],
    isPopular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container mx-auto space-y-12 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-accent px-3 py-1 text-sm">
              Pricing
            </div>
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
              A Plan for Every Salon
            </h2>
            <p className="max-w-[900px] text-foreground/60 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Choose the right plan for your business. All plans start with a
              14-day free trial.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-sm items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.isPopular ? 'border-primary shadow-lg' : ''}
            >
              <CardHeader className="pb-4">
                {plan.isPopular && (
                  <div className="text-right">
                    <div className="inline-block rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                      Most Popular
                    </div>
                  </div>
                )}
                <CardTitle className="font-headline">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-foreground/60">{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  asChild
                >
                  <Link href="/signup">Choose Plan</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="text-center text-sm text-foreground/60">
            Yearly plans available with 2 months free!
        </div>
      </div>
    </section>
  );
}
