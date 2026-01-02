'use client';

import { useTransition } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  addDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  Timestamp,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import type { Service, Staff } from '@/lib/data';
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
  date: z.date({ required_error: 'Please select a date and time.' }),
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

  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      serviceIds: [],
      staffId: '',
      date: new Date(),
    },
  });

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
        });
        customerId = customerDocRef.id;
      } else {
        customerId = customerSnapshot.docs[0].id;
      }
      
      const appointmentData = {
        ...data,
        date: Timestamp.fromDate(data.date),
        salonId,
        customerId,
        status: 'booked',
      };
      
      const appointmentsRef = collection(firestore, `salons/${salonId}/appointments`);
      addDocumentNonBlocking(appointmentsRef, appointmentData);

      toast({
        title: 'Success!',
        description: `Appointment for ${data.customerName} has been booked.`,
      });
      setOpen(false);
    });
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
                <FormLabel>Date & Time</FormLabel>
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
                            format(field.value, "PPP, hh:mm a")
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
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Book Appointment
        </Button>
      </form>
    </Form>
  );
}
