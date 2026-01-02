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

export default function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
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
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input
                type="tel"
                placeholder="Customer Phone Number"
                className="flex-1"
              />
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" /> Search / Check-in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
