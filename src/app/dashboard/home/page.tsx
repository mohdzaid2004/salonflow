
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>
              Here's a quick look at your day.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div>
        <Card className="flex h-full flex-col justify-between">
          <CardHeader>
            <CardTitle>Full Calendar</CardTitle>
            <CardDescription>
              View and manage all appointments for the day, week, or month.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="flex h-full items-center justify-center rounded-lg bg-accent p-8">
              <Calendar className="h-16 w-16 text-primary" />
            </div>
          </CardContent>
          <CardContent>
             <Button asChild className="w-full">
                <Link href="/dashboard/calendar">
                    View Calendar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
