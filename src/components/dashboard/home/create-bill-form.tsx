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
} from 'firebase/firestore';
import type { Service, Staff, Customer, Appointment } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const billFormSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'At least one service is required.'),
  staffId: z.string().min(1, 'Please select a staff member.'),
  paymentMethod: z.enum(['Cash', 'Card', 'UPI'], { required_error: 'Please select a payment method.'}),
  amountPaid: z.coerce.number().min(0, 'Amount must be a positive number.'),
});

type BillFormValues = z.infer<typeof billFormSchema>;

export function CreateBillForm({
  customer,
  staff,
  services,
  setOpen,
  onBillCreated,
}: {
  customer: Customer;
  staff: Staff[];
  services: Service[];
  setOpen: (open: boolean) => void;
  onBillCreated: (appointment: Appointment) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const salonId = user?.uid;

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      serviceIds: [],
      staffId: '',
      amountPaid: 0,
    },
  });

  async function onSubmit(data: BillFormValues) {
    startTransition(async () => {
      if (!salonId || !firestore || !customer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database or user not available.' });
        return;
      }
      
      const appointmentData = {
        ...data,
        salonId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        date: Timestamp.now(),
        status: 'completed' as const,
      };
      
      const appointmentsRef = collection(firestore, `salons/${salonId}/appointments`);
      const docRef = await addDocumentNonBlocking(appointmentsRef, appointmentData);

      const newAppointment: Appointment = {
          id: docRef.id,
          ...appointmentData
      }

      onBillCreated(newAppointment);
      setOpen(false);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                    const newValue = checked
                                        ? [...(field.value || []), service.id]
                                        : (field.value || []).filter(
                                            (value) => value !== service.id
                                          );
                                    field.onChange(newValue);
                                    
                                    const total = newValue.reduce((acc, serviceId) => {
                                        const s = services.find(s => s.id === serviceId);
                                        return acc + (s?.price || 0);
                                    }, 0);
                                    form.setValue('amountPaid', total);
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
            name="amountPaid"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Amount to be Paid (INR)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Payment Method</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                    >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Cash" /></FormControl>
                        <FormLabel className="font-normal">Cash</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Card" /></FormControl>
                        <FormLabel className="font-normal">Card</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="UPI" /></FormControl>
                        <FormLabel className="font-normal">UPI</FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Bill & Check-in
        </Button>
      </form>
    </Form>
  );
}
