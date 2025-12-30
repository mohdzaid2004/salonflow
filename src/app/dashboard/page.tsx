'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CustomerCheckinForm } from '@/components/dashboard/customer-checkin-form';
import { useHeaderActions } from '@/components/dashboard/header-actions-context';
import { useEffect } from 'react';
import { UserPlus } from 'lucide-react';

export default function DashboardPage() {
  const { setActions } = useHeaderActions();
  const [isCheckinOpen, setCheckinOpen] = useState(false);

  useEffect(() => {
    setActions(
      <Dialog open={isCheckinOpen} onOpenChange={setCheckinOpen}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Customer Check-in
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Customer Check-in</DialogTitle>
          </DialogHeader>
          <CustomerCheckinForm setOpen={setCheckinOpen} />
        </DialogContent>
      </Dialog>
    );
    // Cleanup on unmount
    return () => setActions(null);
  }, [setActions, isCheckinOpen]);


  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
          <CardDescription>
            This is your starting point. You now have a clean login and sign-up flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>You can now begin to build out your features on this stable foundation.</p>
        </CardContent>
      </Card>
    </div>
  );
}
