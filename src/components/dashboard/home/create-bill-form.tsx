'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  Timestamp,
  doc,
  increment,
} from 'firebase/firestore';
import type { Service, Staff, Customer, Appointment, Salon } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


const billFormSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'At least one service is required.'),
  staffId: z.string().min(1, 'Please select a staff member.'),
  paymentMethod: z.enum(['Cash', 'Card', 'UPI'], { required_error: 'Please select a payment method.'}),
  redeemPoints: z.coerce.number().min(0, 'Cannot redeem negative points.'),
  finalAmount: z.coerce.number(),
});

type BillFormValues = z.infer<typeof billFormSchema>;

export function CreateBillForm({
  customer,
  staff,
  services,
  salon,
  setOpen,
  onBillCreated,
}: {
  customer: Customer;
  staff: Staff[];
  services: Service[];
  salon: Salon | null;
  setOpen: (open: boolean) => void;
  onBillCreated: (appointment: Appointment) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const salonId = user?.uid;
  const [serviceTotal, setServiceTotal] = useState(0);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      serviceIds: [],
      staffId: '',
      redeemPoints: 0,
      finalAmount: 0,
    },
  });

  const watchServiceIds = useWatch({ control: form.control, name: 'serviceIds' });
  const watchRedeemPoints = useWatch({ control: form.control, name: 'redeemPoints' });
  const customerPoints = customer.loyaltyPoints || 0;
  const loyaltyEnabled = salon?.loyaltyProgramEnabled;

  useEffect(() => {
    const total = (watchServiceIds || []).reduce((acc, serviceId) => {
        const s = services.find(s => s.id === serviceId);
        return acc + (s?.price || 0);
    }, 0);
    setServiceTotal(total);
  }, [watchServiceIds, services]);

  useEffect(() => {
    const pointsToRedeem = loyaltyEnabled ? Math.min(watchRedeemPoints, customerPoints, serviceTotal) : 0;
    const finalAmount = serviceTotal - pointsToRedeem;
    form.setValue('finalAmount', finalAmount);
  }, [serviceTotal, watchRedeemPoints, form, customerPoints, loyaltyEnabled]);
  
  useEffect(() => {
    // Validate redeemed points against new service total
    const pointsToRedeem = loyaltyEnabled ? Math.min(form.getValues('redeemPoints'), customerPoints, serviceTotal) : 0;
    if(form.getValues('redeemPoints') !== pointsToRedeem) {
        form.setValue('redeemPoints', pointsToRedeem);
    }
  }, [serviceTotal, customerPoints, form, loyaltyEnabled]);


  async function onSubmit(data: BillFormValues) {
    startTransition(async () => {
      if (!salonId || !firestore || !customer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database or user not available.' });
        return;
      }
      
      const loyaltyRatio = salon?.loyaltyPointsRatio || 10;
      const pointsToRedeem = loyaltyEnabled ? Math.min(data.redeemPoints, customerPoints, serviceTotal) : 0;
      
      const appointmentData = {
        serviceIds: data.serviceIds,
        staffId: data.staffId,
        paymentMethod: data.paymentMethod,
        amountPaid: data.finalAmount,
        salonId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        date: Timestamp.now(),
        status: 'completed' as const,
      };
      
      const appointmentsRef = collection(firestore, `salons/${salonId}/appointments`);
      const docRef = await addDocumentNonBlocking(appointmentsRef, appointmentData);

      // Award and Redeem loyalty points if enabled
      if (loyaltyEnabled) {
        const pointsEarned = Math.floor(data.finalAmount / loyaltyRatio);
        const pointsChange = pointsEarned - pointsToRedeem;
        
        if (pointsChange !== 0) {
          const customerRef = doc(firestore, `salons/${salonId}/customers`, customer.id);
          updateDocumentNonBlocking(customerRef, {
            loyaltyPoints: increment(pointsChange)
          });
        }
      }


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
        
        <div className="space-y-2 rounded-lg border bg-accent/50 p-4">
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Service Total</span>
                <span className="font-medium">₹{serviceTotal}</span>
             </div>

            {loyaltyEnabled && (
                 <FormField
                    control={form.control}
                    name="redeemPoints"
                    render={({ field }) => (
                        <FormItem>
                            <div className='flex justify-between items-center text-sm'>
                                <FormLabel className="flex items-center gap-2">
                                    <Star className='h-4 w-4 text-amber-400' />
                                    <span>Redeem Points</span>
                                    <span className='text-xs text-muted-foreground'>(Avail: {customerPoints})</span>
                                </FormLabel>
                                <div className="flex items-center gap-2">
                                    <span className='text-muted-foreground'>- ₹</span>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            className="h-8 w-20 text-right" 
                                            {...field}
                                            max={Math.min(customerPoints, serviceTotal)}
                                        />
                                    </FormControl>
                                </div>
                            </div>
                            <FormMessage className="text-right" />
                        </FormItem>
                    )}
                />
            )}
            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-dashed">
                <span>To Pay</span>
                <span>₹{form.getValues('finalAmount')}</span>
            </div>
        </div>
        

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

    