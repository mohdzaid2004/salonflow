'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserCheck } from 'lucide-react';
import { CalendarView } from '@/components/dashboard/calendar-view';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AppointmentForm } from '@/components/dashboard/appointment-form';
import { CustomerCheckinForm } from '@/components/dashboard/customer-checkin-form';
import { useHeaderActions } from '@/components/dashboard/header-actions-context';
import { useEffect } from 'react';

export default function DashboardPage() {
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const { setActions } = useHeaderActions();

  useEffect(() => {
    setActions(
        <>
            <Button variant="outline" onClick={() => setIsCheckinOpen(true)}>
                <UserCheck className="mr-2 h-4 w-4" />
                Check-in Customer
            </Button>
            <Button onClick={() => setIsNewAppointmentOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Appointment
            </Button>
        </>
    );

    // Cleanup on component unmount
    return () => setActions(null);
  }, [setActions]);

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <CalendarView />
      <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>
              Fill in the details to book a new appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <AppointmentForm setOpen={setIsNewAppointmentOpen} />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Customer Check-in</DialogTitle>
            <DialogDescription>
              Find an existing customer or create a new profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CustomerCheckinForm setOpen={setIsCheckinOpen} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
