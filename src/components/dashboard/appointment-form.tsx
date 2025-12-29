'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { customers, services, staff } from '@/lib/data';
import { sendBookingConfirmationAction } from '@/app/dashboard/actions';
import { useToast } from '@/hooks/use-toast';

const appointmentFormSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer.'),
  serviceId: z.string().min(1, 'Please select a service.'),
  staffId: z.string().min(1, 'Please select a staff member.'),
  dateTime: z.date({
    required_error: 'An appointment date and time is required.',
  }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format.'),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export function AppointmentForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      time: '09:00',
    },
  });

  function onSubmit(data: AppointmentFormValues) {
    startTransition(async () => {
      const [hours, minutes] = data.time.split(':').map(Number);
      const appointmentDateTime = new Date(data.dateTime);
      appointmentDateTime.setHours(hours, minutes);

      const customer = customers.find((c) => c.id === data.customerId);
      const service = services.find((s) => s.id === data.serviceId);
      const staffMember = staff.find((s) => s.id === data.staffId);

      if (!customer || !service || !staffMember) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invalid data selected.',
        });
        return;
      }
      
      toast({
        title: 'Booking Appointment...',
        description: 'Please wait while we book the appointment.',
      });

      // The AI action is removed, we'll just simulate a booking.
      // In a real app, you would save this to a database.
      const result = await sendBookingConfirmationAction({
        customerName: customer.name,
        salonName: 'My Awesome Salon',
        appointmentDateTime: format(appointmentDateTime, "PPP 'at' p"),
        serviceNames: [service.name],
        staffName: staffMember.name,
        phoneNumber: customer.phone,
      });

      if (result.success) {
        toast({
          title: 'Success!',
          description: 'Appointment booked successfully.',
        });
        setOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Booking Failed',
          description: 'An unknown error occurred.',
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="dateTime"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                date < new Date(new Date().setHours(0,0,0,0))
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Book Appointment
        </Button>
      </form>
    </Form>
  );
}
