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
import { Loader2, X, CheckCircle, Smartphone } from 'lucide-react';
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
      serviceIds: z.array(z.string()).min(1, 'Please select at least one service.'),
      staffId: z.string().min(1, 'Please select a staff member.'),
      paymentMethod: z.enum(['Cash', 'Card', 'UPI'], { required_error: 'Please select a payment method.'}),
      redeemPoints: z.coerce.number().min(0, "Cannot redeem negative points."),
      finalAmount: z.coerce.number(),
      sendWhatsApp: z.boolean(),
    }).refine((data) => {
        if (!loyaltyEnabled) return true;
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
        message: "Cannot redeem more points than service total.",
        path: ["redeemPoints"],
    });
  }, [customerPoints, services, loyaltyEnabled]);

  type BillFormValues = z.infer<typeof billFormSchema>;

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      serviceIds: appointment?.serviceIds || [],
      staffId: appointment?.staffId || (staff.length > 0 ? staff[0].id : ''),
      paymentMethod: 'Cash',
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
    const redeemPoints = Number(watchRedeemPoints) || 0;
    const finalAmount = Math.max(0, serviceTotal - redeemPoints);
    form.setValue('finalAmount', finalAmount);
  }, [serviceTotal, watchRedeemPoints, form]);

  const sendWhatsAppMessage = async (appointment: Appointment, invoiceNumber: string, invoiceUrl: string) => {
    if (!salonId) return;

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
      `Your bill has been created and payment confirmed. 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🧾 Invoice Details\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Invoice No : ${invoiceNumber}\n` +
      `Date       : ${paymentDate}\n` +
      `Time       : ${paymentTime}\n\n` +
      `💇 Service(s):\n` +
      `${serviceList}\n\n` +
      `💰 Total to Pay : ₹${appointment.amountPaid}\n` +
      `💳 Payment Mode : ${appointment.paymentMethod}\n\n` +
      `🎁 Loyalty Points Earned : ${pointsEarned}\n` +
      `⭐ Current Balance : ${currentPoints} Points\n\n` +
      `${invoiceUrl ? `👉 View Invoice: ${invoiceUrl}\n` : ''}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⭐ Rate Your Experience\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `👉 ${feedbackLink}\n\n` +
      `Thank you for choosing ${salon?.name || 'our salon'} ❤️`;

    const phone = `91${appointment.customerPhone}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  async function onSubmit(data: BillFormValues) {
    startTransition(async () => {
      if (!salonId || !firestore || !customer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database or user not available.' });
        return;
      }
      
      const loyaltyPercentage = salon?.loyaltyPointsRatio || 5;
      const pointsToRedeem = loyaltyEnabled ? (Number(data.redeemPoints) || 0) : 0;
      
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
          visitHistory: arrayUnion(apptId),
          lastVisit: Timestamp.now(),
          totalVisits: increment(1),
          totalSpent: increment(data.finalAmount),
      };

      if (loyaltyEnabled) {
        const pointsEarned = Math.floor(data.finalAmount * (loyaltyPercentage / 100));
        const pointsChange = pointsEarned - pointsToRedeem;
        if (pointsChange !== 0) {
          updateData.loyaltyPoints = increment(pointsChange);
        }
      }

      await updateDocumentNonBlocking(customerRef, updateData);

      const now = new Date();
      const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const invoiceNo = `INV-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const invoiceData = {
        invoiceNo,
        appointmentId: apptId,
        customer: customer.name,
        phone: customer.phone,
        items: data.serviceIds.map(id => services.find(s => s.id === id)?.name).filter(Boolean).join(', '),
        subtotal: serviceTotal,
        discount: pointsToRedeem,
        total: data.finalAmount,
        method: data.paymentMethod,
        status: 'Paid',
        pointsEarned: loyaltyEnabled ? Math.floor(data.finalAmount * (loyaltyPercentage / 100)) : 0,
        loyaltyBalance: (customer.loyaltyPoints || 0) + (loyaltyEnabled ? Math.floor(data.finalAmount * (loyaltyPercentage / 100)) - pointsToRedeem : 0),
        date: now.toISOString().split('T')[0],
        createdAt: now.toISOString(),
      };

      await addDocumentNonBlocking(collection(firestore, `salons/${salonId}/invoices`), invoiceData);

      const invoiceUrl = `${window.location.origin}/invoice/${salonId}_${apptId}`;
      const createdAppt: Appointment = {
        ...appointmentData,
        id: apptId,
      } as any;

      setSuccessData({
        appointment: createdAppt,
        invoiceNumber: invoiceNo,
        invoiceUrl,
      });

      onBillCreated(createdAppt);

      if (data.sendWhatsApp && salon?.automatedWhatsappEnabled) {
        sendWhatsAppMessage(createdAppt, invoiceNo, invoiceUrl);
      }

      toast({
        title: 'Bill Created & Checked In! 🎉',
        description: `Invoice ${invoiceNo} generated for ${customer.name}.`,
      });

      setIsSuccess(true);
    });
  }

  if (isSuccess && successData) {
    const { appointment, invoiceNumber, invoiceUrl } = successData;
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-600" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">Bill Created Successfully!</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{invoiceNumber}</p>
        </div>

        <div className="w-full bg-slate-50 rounded-2xl p-4 space-y-2 text-xs border border-slate-100">
          <div className="flex justify-between text-slate-600">
            <span>Customer</span>
            <span className="font-semibold text-slate-900">{appointment.customerName}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Total to Pay</span>
            <span className="font-bold text-purple-700 text-sm">₹{appointment.amountPaid}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Payment Mode</span>
            <span className="font-semibold text-slate-900">{appointment.paymentMethod}</span>
          </div>
        </div>

        <div className="w-full space-y-2 pt-2">
          {form.getValues('sendWhatsApp') && (
            <Button
              type="button"
              onClick={() => sendWhatsAppMessage(appointment, invoiceNumber, invoiceUrl)}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <Smartphone className="h-4 w-4" />
              Share Invoice on WhatsApp
            </Button>
          )}
          
          <Button 
            type="button"
            variant="outline" 
            onClick={() => setOpen(false)} 
            className="w-full h-10 rounded-xl border-slate-200 text-xs font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-slate-900">
        
        {/* Customer Header Info */}
        <div className="pb-3 border-b border-slate-100">
          <div className="font-bold text-slate-900 text-base">{customer.name}</div>
          <div className="text-xs text-slate-500 font-mono">+91 {customer.phone}</div>
        </div>

        {/* 1. Services */}
        <FormField
          control={form.control}
          name="serviceIds"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Services</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FormControl>
                    <Button 
                      type="button"
                      variant="outline" 
                      className="w-full h-10 px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium justify-between shadow-xs"
                    >
                      <span>
                        {field.value?.length > 0
                          ? `${field.value.length} service(s) selected`
                          : 'Select services'}
                      </span>
                      <span className="text-slate-400 text-xs">▼</span>
                    </Button>
                  </FormControl>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-56 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 p-1">
                  <DropdownMenuLabel className="text-xs font-bold text-slate-500 px-2 py-1">Available Services</DropdownMenuLabel>
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
                      className="text-xs py-1.5 px-2 rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800">{service.name}</span>
                      <span className="font-semibold text-purple-700 ml-2">₹{service.price}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Selected Services Tags */}
              {field.value?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {field.value.map((serviceId) => {
                    const service = services.find((s) => s.id === serviceId);
                    if (!service) return null;
                    return (
                      <span 
                        key={serviceId} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-medium"
                      >
                        <span>{service.name} (₹{service.price})</span>
                        <button
                          type="button"
                          aria-label={`Remove ${service.name}`}
                          className="text-purple-500 hover:text-purple-800 rounded-full"
                          onClick={() => {
                            field.onChange(
                              field.value?.filter((id) => id !== serviceId)
                            );
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <FormMessage className="text-xs text-rose-500" />
            </FormItem>
          )}
        />

        {/* 2. Assign Staff */}
        <FormField
          control={form.control}
          name="staffId"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Assign Staff</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full h-10 px-3 rounded-xl border-slate-200 bg-white text-slate-800 text-xs font-medium shadow-xs">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white rounded-xl shadow-lg border border-slate-200">
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs py-1.5 cursor-pointer">
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs text-rose-500" />
            </FormItem>
          )}
        />
        
        {/* 3. Bill Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">3. Bill Summary</div>
          
          <div className="flex justify-between items-center text-xs text-slate-600">
            <span>Service Total</span>
            <span className="font-semibold text-slate-900">₹{serviceTotal}</span>
          </div>

          {loyaltyEnabled && customerPoints > 0 && (
            <FormField
              control={form.control}
              name="redeemPoints"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <div>
                      <span>Redeem Points</span>
                      <span className="text-[10px] text-slate-400 ml-1">({customerPoints} avail)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">- ₹</span>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          className="h-7 w-16 text-right text-xs rounded-lg border-slate-200 bg-white"
                          value={field.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*$/.test(val)) {
                              field.onChange(val === '' ? 0 : Number(val));
                            }
                          }}
                        />
                      </FormControl>
                    </div>
                  </div>
                  <FormMessage className="text-right text-xs text-rose-500" />
                </FormItem>
              )}
            />
          )}

          <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total to Pay</span>
            <span className="text-purple-700 text-base">₹{finalAmountForDisplay}</span>
          </div>
        </div>

        {/* 4. Payment Method */}
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wide">4. Payment Method</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-3 gap-2"
                >
                  {['Cash', 'Card', 'UPI'].map((method) => (
                    <label
                      key={method}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                        field.value === method
                          ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <RadioGroupItem value={method} className="text-purple-600" />
                      <span>{method}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage className="text-xs text-rose-500" />
            </FormItem>
          )}
        />

        {/* 5. WhatsApp Notification */}
        <FormField
          control={form.control}
          name="sendWhatsApp"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="space-y-0.5">
                <FormLabel className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Send bill & feedback link to customer
                </FormLabel>
                <div className="text-[10px] text-slate-400">
                  Direct WhatsApp receipt delivery
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-purple-600"
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {/* Full-width Purple Button */}
        <Button 
          type="submit" 
          className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition-all mt-2" 
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Bill & Check-in
        </Button>

      </form>
    </Form>
  );
}
