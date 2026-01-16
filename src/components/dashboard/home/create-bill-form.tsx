'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
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
import { Loader2, Star, ChevronsUpDown, X } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
  const finalAmountForDisplay = useWatch({ control: form.control, name: 'finalAmount' });

  const customerPoints = customer.loyaltyPoints || 0;
  const loyaltyEnabled = salon?.loyaltyProgramEnabled;

  const serviceTotal = useMemo(() => {
    return (watchServiceIds || []).reduce((acc, serviceId) => {
        const s = services.find(s => s.id === serviceId);
        return acc + (s?.price || 0);
    }, 0);
  }, [watchServiceIds, services]);


  useEffect(() => {
    const currentRedeemInput = watchRedeemPoints || 0;
    const maxRedeemable = Math.min(customerPoints, serviceTotal);
    const cappedRedeemPoints = loyaltyEnabled ? Math.min(currentRedeemInput, maxRedeemable) : 0;
    
    if (currentRedeemInput !== cappedRedeemPoints) {
        form.setValue('redeemPoints', cappedRedeemPoints);
    }

    const finalAmount = serviceTotal - cappedRedeemPoints;
    form.setValue('finalAmount', finalAmount);

  }, [serviceTotal, watchRedeemPoints, customerPoints, loyaltyEnabled, form]);
  

  const sendWhatsAppMessage = (appointment: Appointment) => {
    if (!salonId) return;
    const staffName = staff.find(s => s.id === appointment.staffId)?.name || 'our staff';
    const feedbackId = `${salonId}_${appointment.id}`;
    const feedbackLink = `${window.location.origin}/feedback/${feedbackId}`;
    
    const message = `Hi ${appointment.customerName}, thanks for visiting ${salon?.name || 'our salon'}! Your bill for today is ₹${appointment.amountPaid}.
    
We'd love to hear your feedback on your service with ${staffName}. Please take a moment to leave a review:
${feedbackLink}
    
We look forward to seeing you again!`;

    const whatsappUrl = `https://web.whatsapp.com/send?phone=91${appointment.customerPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }


  async function onSubmit(data: BillFormValues) {
    startTransition(async () => {
      if (!salonId || !firestore || !customer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database or user not available.' });
        return;
      }
      
      const loyaltyPercentage = salon?.loyaltyPointsRatio || 5; // Default to 5%
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
        const pointsEarned = Math.floor(data.finalAmount * (loyaltyPercentage / 100));
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
      sendWhatsAppMessage(newAppointment);
      setOpen(false);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="serviceIds"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Services</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      <span>
                        {field.value?.length > 0
                          ? `${field.value.length} service(s) selected`
                          : 'Select services'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  <DropdownMenuLabel>Available Services</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {services.map((service) => (
                    <DropdownMenuCheckboxItem
                      key={service.id}
                      checked={field.value?.includes(service.id)}
                      onSelect={(e) => e.preventDefault()} // This prevents the menu from closing
                      onCheckedChange={(checked) => {
                        const currentServices = field.value || [];
                        return checked
                          ? field.onChange([...currentServices, service.id])
                          : field.onChange(
                              currentServices.filter(
                                (value) => value !== service.id
                              )
                            );
                      }}
                    >
                      <span className="flex-grow">{service.name}</span>
                      <span className="text-muted-foreground text-xs ml-4">₹{service.price}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <FormMessage />
              {field.value?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {field.value.map((serviceId) => {
                    const service = services.find((s) => s.id === serviceId);
                    if (!service) return null;
                    return (
                      <Badge key={serviceId} variant="secondary" className="py-1 pl-3 pr-1.5 text-sm">
                        {service.name}
                        <button
                          type="button"
                          aria-label={`Remove ${service.name}`}
                          className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-background/50"
                          onClick={() => {
                            field.onChange(
                              field.value?.filter((id) => id !== serviceId)
                            );
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
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
                <span>₹{finalAmountForDisplay}</span>
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
