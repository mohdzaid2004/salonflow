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
import { Search, Image as ImageIcon } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="mb-8 flex items-center gap-2 text-center">
        <Logo className="h-10 w-10 text-primary" />
        <div className="flex flex-col items-start">
            <span className="font-headline text-3xl font-bold">Your Salon</span>
        </div>
      </div>
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-3xl">
              Customer Check-in
            </CardTitle>
            <CardDescription>
              Enter a customer's phone number to begin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="tel"
              placeholder="Customer Phone Number"
            />
            <Button type="submit" className="w-full">
              <Search className="mr-2 h-4 w-4" /> Search / Check-in
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
