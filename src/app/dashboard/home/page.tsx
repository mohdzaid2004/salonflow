'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="w-full max-w-lg">
        <Card className="py-4 mb-8">
          <CardHeader className="items-center text-center">
             <div className="mb-4 flex items-center gap-2">
                <Logo className="h-8 w-8 text-primary" />
                <span className="font-headline text-2xl font-bold">Your Salon</span>
            </div>
            <CardTitle className="font-headline text-3xl">
              Customer Check-in
            </CardTitle>
            <CardDescription>
              Enter a customer's phone number to begin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center">
              <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-background px-3 text-sm text-muted-foreground">
                +91
              </span>
              <Input
                type="tel"
                placeholder="Customer Phone Number"
                className="rounded-l-none"
              />
            </div>
            <Button type="submit" className="w-full">
              <Search className="mr-2 h-4 w-4" /> Search / Check-in
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
