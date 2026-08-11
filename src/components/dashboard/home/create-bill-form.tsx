'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2, Star, ChevronsUpDown, X, CheckCircle, MessageCircle } from 'lucide-react';
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
  arrayUnion,
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
import { Switch } from '@/components/ui/switch';

export function CreateBillForm({
  customer,
  staff,
  services,
  salon,
  setOpen,
  onBillCreated,
  appointment,
}: {
  customer: Customer;
  staff: Staff[];
  services: Service[];
  salon: Salon | null;
  setOpen: (open: boolean) => void;
  onBillCreated: (appointment: Appointment) => void;
  appointment?: Appointment;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const salonId = user?.uid;

  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ appointment: Appointment, invoiceNumber: string, invoiceUrl: string } | null>(null);

  const customerPoints = customer.loyaltyPoints || 0;
  const loyaltyEnabled = salon?.loyaltyProgramEnabled;

  const billFormSchema = useMemo(() => {
    return z.object({
      serviceIds: z.array(z.string()).min(1, 'At least one service is required.'),
      staffId: z.string().min(1, 'Please select a staff member.'),
      paymentMethod: z.enum(['Cash', 'Card', 'UPI'], { required_error: 'Please select a payment method.'}),
      redeemPoints: z.coerce.number().min(0, "Cannot redeem negative points."),
      finalAmount: z.coerce.number(),
      sendWhatsApp: z.boolean(),
    }).refine((data) => {
        if (!loyaltyEnabled) return true; // if loyalty is off, no validation needed
        return data.redeemPoints <= customerPoints;
    }, {
        message: `Cannot redeem more than ${customerPoints} available points.`,
        path: ["redeemPoints"],
    }).refine((data) => {
        if (!loyaltyEnabled) return true;
        const serviceTotal = (data.serviceIds || []).reduce((acc, serviceId) => {
            const s = services.find(s => s.id === serviceId);
            return acc + (s?.price || 0);
        }, 0);
        return data.redeemPoints <= serviceTotal;
    }, {
        message: "Cannot redeem more points than the service total.",
        path: ["redeemPoints"],
    });
  }, [customerPoints, services, loyaltyEnabled]);

  type BillFormValues = z.infer<typeof billFormSchema>;

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      serviceIds: appointment?.serviceIds || [],
      staffId: appointment?.staffId || '',
      redeemPoints: 0,
      finalAmount: 0,
      sendWhatsApp: true,
    },
    mode: 'onChange',
  });

  const watchServiceIds = useWatch({ control: form.control, name: 'serviceIds' });
  const watchRedeemPoints = useWatch({ control: form.control, name: 'redeemPoints' });
  const finalAmountForDisplay = useWatch({ control: form.control, name: 'finalAmount' });

  const serviceTotal = useMemo(() => {
    return (watchServiceIds || []).reduce((acc, serviceId) => {
        const s = services.find(s => s.id === serviceId);
        return acc + (s?.price || 0);
    }, 0);
  }, [watchServiceIds, services]);


  useEffect(() => {
    const redeemPoints = watchRedeemPoints || 0;
    const finalAmount = serviceTotal - redeemPoints;
    form.setValue('finalAmount', Math.max(0, finalAmount));
  }, [serviceTotal, watchRedeemPoints, form]);
  

  const sendWhatsAppMessage = async (appointment: Appointment, invoiceNumber: string, invoiceUrl: string) => {
    if (!salonId) return;

    // Map serviceIds to service names and prices
    const selectedServices = (appointment.serviceIds || []).map(id => {
      const s = services.find(srv => srv.id === id);
      return s ? `- ${s.name}: ₹${s.price}` : null;
    }).filter(Boolean);
    const serviceList = selectedServices.length > 0 ? selectedServices.join('\n') : '- Service(s)';

    const paymentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const paymentTime = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

    const feedbackId = `${salonId}_${appointment.id}`;
    const feedbackLink = `${window.location.origin}/feedback/${feedbackId}`;

    const loyaltyPercentage = salon?.loyaltyPointsRatio || 5;
    const pointsEarned = Math.floor(appointment.amountPaid * (loyaltyPercentage / 100));
    const currentPoints = (customer.loyaltyPoints || 0) + pointsEarned - (appointment.pointsRedeemed || 0);

    const message = `💇 Thank You for Visiting ${salon?.name || 'our salon'}!\n\n` +
      `Hi ${appointment.customerName},\n\n` +
      `Your payment has been received successfully. 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🧾 Invoice Details\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Invoice No : ${invoiceNumber}\n` +
      `Date       : ${paymentDate}\n` +
      `Time       : ${paymentTime}\n\n` +
      `💇 Service(s):\n` +
      `${serviceList}\n\n` +
      `💰 Total Amount : ₹${appointment.amountPaid}\n` +
      `💳 Payment Mode : ${appointment.paymentMethod}\n\n` +
      `🎁 Loyalty Points Earned : ${pointsEarned}\n` +
      `⭐ Current Balance : ${currentPoints} Points\n\n` +
      `📎 Your PDF Invoice is attached to this message.\n` +
      `${invoiceUrl ? `👉 View / Download PDF: ${invoiceUrl}\n` : ''}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⭐ Rate Your Experience\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `We hope you loved your visit!\n\n` +
      `Please take 30 seconds to rate your experience.\n\n` +
      `⭐⭐⭐⭐⭐\n\n` +
      `👉 ${feedbackLink}\n\n` +
      `Your feedback helps us improve our services and serve you better.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Thank you for choosing ${salon?.name || 'our salon'} ❤️\n\n` +
      `We look forward to welcoming you again.\n\n` +
      `📍 ${salon?.address || ''}\n` +
      `📞 ${salon?.phone || ''}`;

    const phone = `91${appointment.customerPhone}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }


  async function onSubmit(data: BillFormValues) {
    startTransition(async () => {
      if (!salonId || !firestore || !customer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database or user not available.' });
        return;
      }
      
      const loyaltyPercentage = salon?.loyaltyPointsRatio || 5; // Default to 5%
      const pointsToRedeem = loyaltyEnabled ? data.redeemPoints : 0;
      
      const appointmentData = {
        serviceIds: data.serviceIds,
        services: data.serviceIds.map(id => {
          const s = services.find(srv => srv.id === id);
          return { id, name: s?.name || '', price: s?.price || 0 };
        }).filter(Boolean),
        staffId: data.staffId,
        paymentMethod: data.paymentMethod,
        subtotal: serviceTotal,
        pointsRedeemed: pointsToRedeem,
        amountPaid: data.finalAmount,
        salonId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        date: Timestamp.now(),
        status: 'completed' as const,
      };
      
      let apptId = '';
      if (appointment) {
        apptId = appointment.id;
        const apptDocRef = doc(firestore, `salons/${salonId}/appointments`, appointment.id);
        await updateDocumentNonBlocking(apptDocRef, appointmentData);
      } else {
        const appointmentsRef = collection(firestore, `salons/${salonId}/appointments`);
        const docRef = await addDocumentNonBlocking(appointmentsRef, appointmentData);
        apptId = docRef.id;
      }

      const customerRef = doc(firestore, `salons/${salonId}/customers`, customer.id);
      const updateData: any = {
          visitHistory: arrayUnion(apptId)
      };

      // Award and Redeem loyalty points if enabled
      if (loyaltyEnabled) {
        const pointsEarned = Math.floor(data.finalAmount * (loyaltyPercentage / 100));
        const pointsChange = pointsEarned - pointsToRedeem;
        
        if (pointsChange !== 0) {
          updateData.loyaltyPoints = increment(pointsChange)
        }
      }
      
      if(Object.keys(updateData).length > 0) {
        updateDocumentNonBlocking(customerRef, updateData);
      }


      const newAppointment: Appointment = {
          id: apptId,
          ...appointmentData
      }

      onBillCreated(newAppointment);

      let invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${apptId.slice(-6).toUpperCase()}`;
      let invoiceUrl = '';
      try {
        // Await the backend invoicing pipeline to prevent browser from aborting the request on modal close
        const res = await fetch('/api/billing/invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            salonId,
            appointmentId: apptId,
            sendWhatsApp: data.sendWhatsApp && salon?.automatedWhatsappEnabled
          })
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success) {
            invoiceNumber = resData.invoiceNumber;
            invoiceUrl = resData.invoiceUrl;
          }
        } else {
          console.error('[Billing Checkout] Invoicing pipeline error:', res.statusText);
        }
      } catch (err) {
        console.error('[Billing Checkout] Invoicing pipeline fetch error:', err);
      }

      setSuccessData({
        appointment: newAppointment,
        invoiceNumber,
        invoiceUrl
      });
      setIsSuccess(true);
    });
  }

  if (isSuccess && successData) {
    const { appointment, invoiceNumber, invoiceUrl } = successData;
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <div>
          <h3 className="text-xl font-semibold font-headline">Payment Recorded Successfully!</h3>
          <p className="text-sm text-muted-foreground mt-1">Invoice No: {invoiceNumber}</p>
        </div>

        <div className="w-full bg-accent/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium">{appointment.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid:</span>
            <span className="font-medium">₹{appointment.amountPaid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="font-medium">{appointment.paymentMethod}</span>
          </div>
        </div>

        <div className="w-full space-y-2 pt-2">
          {form.getValues('sendWhatsApp') && (
            <Button
              onClick={() => sendWhatsAppMessage(appointment, invoiceNumber, invoiceUrl)}
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
                      onSelect={(e) => e.preventDefault()}
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
                                          type="text"
                                          inputMode="numeric"
                                          className="h-8 w-20 text-right"
                                          ref={field.ref}
                                          name={field.name}
                                          value={field.value}
                                          onFocus={(e) => {
                                            if (e.target.value === '0') {
                                              field.onChange('');
                                            }
                                          }}
                                          onBlur={(e) => {
                                            field.onBlur();
                                            if (e.target.value === '') {
                                              field.onChange(0);
                                            }
                                          }}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^\d*$/.test(val)) {
                                              field.onChange(val === '' ? '' : Number(val));
                                            }
                                          }}
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

        <FormField
          control={form.control}
          name="sendWhatsApp"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Send WhatsApp Notification</FormLabel>
                <FormDescription>
                  Send bill and feedback link to the customer.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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
