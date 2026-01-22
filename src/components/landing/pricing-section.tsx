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
    name: 'Premium Plan',
    price: '599',
    period: '/ month',
    description:
      'Everything you need to manage and grow your salon. Simple, powerful, and affordable.',
    features: [
      'Unlimited Staff Members',
      'Unlimited Appointments',
      'GST Billing & Invoicing',
      'Customer Management',
      'WhatsApp Bill Sharing',
      'Staff & Customer Reviews',
      'Advanced Reporting',
    ],
    isPopular: true,
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
              Simple, All-Inclusive Pricing
            </h2>
            <p className="max-w-[900px] text-foreground/60 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              One plan with everything you need. All new sign-ups start with a
              14-day free trial.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-md items-start gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.isPopular ? 'border-primary shadow-lg' : ''}
            >
              <CardHeader className="pb-4">
                <CardTitle className="font-headline">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    <span className="font-arial">₹</span>
                    {plan.price}
                  </span>
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
                  <Link href="/signup">Get Started</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="text-center text-sm text-foreground/60">
          Yearly plan available with 2 months free!
        </div>
      </div>
    </section>
  );
}
