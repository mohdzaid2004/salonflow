import { CalendarClock, Scissors, Users, IndianRupee } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const features = [
  {
    icon: <CalendarClock className="h-10 w-10 text-primary" />,
    title: 'Smart Appointment Booking',
    description: 'Manage your calendar with a simple, intuitive interface. Handle bookings, walk-ins, and reschedules in a few clicks.',
  },
  {
    icon: <Scissors className="h-10 w-10 text-primary" />,
    title: 'Service & Staff Management',
    description: 'Easily add your services with custom pricing. Manage your staff, their schedules, and performance all in one place.',
  },
  {
    icon: <IndianRupee className="h-10 w-10 text-primary" />,
    title: 'Instant Billing & Payments',
    description: 'Generate customer invoices and receipts effortlessly. Track payments via Cash, UPI, or Card.',
  },
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: 'Customer Management',
    description: 'Keep track of your customer base, their visit history, and preferences to provide a personalized experience.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="w-full bg-card py-12 md:py-24 lg:py-32">
      <div className="container mx-auto space-y-12 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-accent px-3 py-1 text-sm">
              Key Features
            </div>
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
              Everything You Need to Run Your Salon
            </h2>
            <p className="max-w-[900px] text-foreground/60 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              From bookings to billing, we've built a simple yet powerful tool
              to help you succeed.
            </p>
          </div>
        </div>
        <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-col items-center text-center">
                {feature.icon}
                <CardTitle className="mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-foreground/60">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
