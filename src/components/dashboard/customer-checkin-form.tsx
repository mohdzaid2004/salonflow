'use client';

import { useTransition, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  useDoc,
  addDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  doc,
  Timestamp,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import type { Service, Staff, Salon } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';

const checkinFormSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required.'),
  customerPhone: z
    .string()
    .length(10, 'Phone number must be 10 digits.'),
  serviceIds: z.array(z.string()).min(1, 'At least one service is required.'),
  staffId: z.string().min(1, 'Please select a staff member.'),
  date: z.date({ required_error: 'Please select a date.' }),
  timeSlot: z.string().min(1, 'Please select an available time slot.'),
  sendWhatsApp: z.boolean(),
});

type CheckinFormValues = z.infer<typeof checkinFormSchema>;

export function CustomerCheckinForm({
  staff,
  services,
  setOpen,
}: {
  staff: Staff[];
  services: Service[];
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const salonId = user?.uid;

  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ appointment: any; serviceNames: string } | null>(null);
  
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: salon } = useDoc<Salon>(salonDocRef);

  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      serviceIds: [],
      staffId: '',
      date: new Date(),
      timeSlot: '',
      sendWhatsApp: true,
    },
  });

  const selectedDate = form.watch('date');
  const selectedStaffId = form.watch('staffId');

  const timeSlots = useMemo(() => {
    const slots = [];
    let current = new Date();
    current.setHours(9, 0, 0, 0); // Start at 9:00 AM
    const end = new Date();
    end.setHours(21, 0, 0, 0); // End at 9:00 PM
    
    while (current < end) {
      slots.push(format(current, 'hh:mm a'));
      current = new Date(current.getTime() + 30 * 60 * 1000); // add 30 mins
    }
    return slots;
  }, []);

  useMemo(() => {
    if (!firestore || !salonId || !selectedDate || !selectedStaffId) {
      setBookedSlots([]);
      return;
    }

    const fetchBookedSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const apptsRef = collection(firestore, `salons/${salonId}/appointments`);
        const q = query(
          apptsRef,
          where('staffId', '==', selectedStaffId),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay))
        );

        const snap = await getDocs(q);
        const booked = snap.docs
          .map(doc => {
            const data = doc.data();
            if (data.status === 'cancelled') return null;
            const d = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
            return format(d, 'hh:mm a');
          })
          .filter(Boolean) as string[];
        setBookedSlots(booked);
      } catch (err) {
        console.error("Error fetching booked slots:", err);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchBookedSlots();
  }, [firestore, salonId, selectedDate, selectedStaffId]);

  const sendWhatsAppCheckinMessage = (appointment: any, serviceNames: string) => {
    if (!salonId) return;

    const apptDate = appointment.date && appointment.date.toDate ? appointment.date.toDate() : new Date(appointment.date);
    const appointmentDateStr = format(apptDate, "dd-MM-yyyy");
    const appointmentTimeStr = format(apptDate, "hh:mm a");

    const isToday = format(apptDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    let whatsappMessage = '';
    if (isToday) {
      whatsappMessage = `Hi ${appointment.customerName}\n\n✅ Your check-in has been confirmed.\n\nPlease wait while our staff prepares for your appointment.`;
    } else {
      whatsappMessage = `Hi ${appointment.customerName} 👋\n\nYour appointment has been confirmed.\n\n📅 Date: ${appointmentDateStr}\n🕒 Time: ${appointmentTimeStr}\n💇 Service: ${serviceNames}\n\nThank you for choosing Salon Flow ❤️`;
    }

    const phone = `91${appointment.customerPhone}`;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  async function onSubmit(data: CheckinFormValues) {
    startTransition(async () => {
      if (!salonId || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
        return;
      }

      // Check if customer exists, otherwise create
      const customersRef = collection(firestore, `salons/${salonId}/customers`);
      const q = query(customersRef, where('phone', '==', data.customerPhone), limit(1));
      const customerSnapshot = await getDocs(q);

      let customerId: string;
      if (customerSnapshot.empty) {
        const customerDocRef = await addDocumentNonBlocking(customersRef, {
          name: data.customerName,
          phone: data.customerPhone,
          salonId: salonId,
          visitHistory: [],
          loyaltyPoints: 0,
        });
        customerId = customerDocRef.id;
      } else {
        customerId = customerSnapshot.docs[0].id;
      }
      
      const [hoursStr, minutesStr, period] = data.timeSlot.split(/[: ]/);
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const combinedDate = new Date(data.date);
      combinedDate.setHours(hours, minutes, 0, 0);

      const appointmentData = {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        serviceIds: data.serviceIds,
        services: data.serviceIds.map(id => {
          const s = services.find(srv => srv.id === id);
          return { id, name: s?.name || '', price: s?.price || 0 };
        }).filter(Boolean),
        staffId: data.staffId,
        date: Timestamp.fromDate(combinedDate),
        salonId,
        customerId,
        status: 'booked' as const,
      };
      
      const appointmentsRef = collection(firestore, `salons/${salonId}/appointments`);
      const docRef = await addDocumentNonBlocking(appointmentsRef, appointmentData);

      const serviceNames = data.serviceIds
        .map(id => services.find(s => s.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      // Trigger Twilio WhatsApp notification automatically if enabled in settings
      if (data.sendWhatsApp && salon?.automatedWhatsappEnabled) {
        const appointmentDateStr = format(data.date, "dd-MM-yyyy");
        const appointmentTimeStr = format(data.date, "hh:mm a");

        const isToday = format(data.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

        let whatsappMessage = '';
        if (isToday) {
          whatsappMessage = `Hi ${data.customerName}\n\n✅ Your check-in has been confirmed.\n\nPlease wait while our staff prepares for your appointment.`;
        } else {
          whatsappMessage = `Hi ${data.customerName} 👋\n\nYour appointment has been confirmed.\n\n📅 Date: ${appointmentDateStr}\n🕒 Time: ${appointmentTimeStr}\n💇 Service: ${serviceNames}\n\nThank you for choosing Salon Flow ❤️`;
        }

        const phone = `91${data.customerPhone}`;

        fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone, message: whatsappMessage }),
        }).then(response => {
          if (!response.ok) {
            console.error("Twilio check-in WhatsApp dispatch failed:", response.statusText);
          }
        }).catch(err => {
          console.error("Twilio check-in WhatsApp dispatch error:", err);
        });
      }

      toast({
        title: 'Success!',
        description: `Appointment for ${data.customerName} has been booked.`,
      });

      setSuccessData({
        appointment: {
          id: docRef.id,
          ...appointmentData
        },
        serviceNames
      });
      setIsSuccess(true);
    });
  }

  if (isSuccess && successData) {
    const { appointment, serviceNames } = successData;
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <div>
          <h3 className="text-xl font-semibold font-headline">Check-in Confirmed!</h3>
          <p className="text-sm text-muted-foreground mt-1">For {appointment.customerName}</p>
        </div>

        <div className="w-full bg-accent/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone:</span>
            <span className="font-medium font-mono">+91 {appointment.customerPhone}</span>
          </div>
          <div className="flex justify-between flex-col items-start gap-1">
            <span className="text-muted-foreground">Services:</span>
            <span className="font-medium text-left">{serviceNames}</span>
          </div>
        </div>

        <div className="w-full space-y-2 pt-2">
          {form.getValues('sendWhatsApp') && !salon?.automatedWhatsappEnabled && (
            <Button
              onClick={() => sendWhatsAppCheckinMessage(appointment, serviceNames)}
              className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp to Share
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => {
              setOpen(false);
            }} 
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <FormControl><Input placeholder="Full Name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Phone</FormLabel>
              <FormControl><Input type="tel" placeholder="10-digit number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="serviceIds"
            render={() => (
                <FormItem>
                <div className="mb-4">
                    <FormLabel>Services</FormLabel>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2 rounded-md border p-2">
                    {services.map((service) => (
                    <FormField
                        key={service.id}
                        control={form.control}
                        name="serviceIds"
                        render={({ field }) => {
                        return (
                            <FormItem
                                key={service.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                            >
                                <FormControl>
                                <Checkbox
                                    checked={field.value?.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                    return checked
                                        ? field.onChange([...field.value, service.id])
                                        : field.onChange(
                                            field.value?.filter(
                                            (value) => value !== service.id
                                            )
                                        )
                                    }}
                                />
                                </FormControl>
                                <FormLabel className="font-normal w-full flex justify-between">
                                    <span>{service.name}</span>
                                    <span className="text-muted-foreground">₹{service.price}</span>
                                </FormLabel>
                            </FormItem>
                        )
                        }}
                    />
                    ))}
                </div>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="staffId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Staff</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a staff member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
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
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
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
                            date < new Date(new Date().setDate(new Date().getDate() - 1))
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
          name="timeSlot"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Available Time Slot</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedStaffId || isLoadingSlots}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedStaffId ? "Please select staff first" : isLoadingSlots ? "Loading slots..." : "Select a time slot"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timeSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    return (
                      <SelectItem key={slot} value={slot} disabled={isBooked}>
                        {slot} {isBooked ? '(Booked)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sendWhatsApp"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Send WhatsApp Notification</FormLabel>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Book Appointment
        </Button>
      </form>
    </Form>
  );
}
