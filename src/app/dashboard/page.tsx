'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { CalendarView } from '@/components/dashboard/calendar-view';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AppointmentForm } from '@/components/dashboard/appointment-form';

export default function DashboardPage() {
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <div className="flex items-center">
        <h1 className="font-headline text-3xl md:text-4xl">Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setIsNewAppointmentOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>
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
    </div>
  );
}
