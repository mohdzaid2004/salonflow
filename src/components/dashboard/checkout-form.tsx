'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Customer, Service, Staff } from '@/lib/data';
import { Card, CardContent } from '../ui/card';

const checkoutFormSchema = z.object({
  serviceIds: z
    .array(z.string())
    .refine((value) => value.some((item) => item), {
      message: 'You have to select at least one service.',
    }),
  staffId: z.string().min(1, 'Please select a staff member.'),
  paymentMethod: z.string().min(1, 'Please select a payment method.'),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export function CheckoutForm({
  customer,
  onCheckoutComplete,
}: {
  customer: Customer;
  onCheckoutComplete: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const salonId = user?.uid;

  const servicesQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);

  const { data: services, isLoading: servicesLoading } =
    useCollection<Service>(servicesQuery);
  const { data: staff, isLoading: staffLoading } =
    useCollection<Staff>(staffQuery);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      serviceIds: [],
      paymentMethod: 'Cash',
    },
  });

  const selectedServiceIds = form.watch('serviceIds');

  useEffect(() => {
    if (services) {
      const selectedServices = services.filter((service) =>
        selectedServiceIds?.includes(service.id)
      );
      const newTotal = selectedServices.reduce(
        (sum, service) => sum + service.price,
        0
      );
      setTotal(newTotal);
    }
  }, [selectedServiceIds, services]);

  function onSubmit(data: CheckoutFormValues) {
    startTransition(async () => {
      if (!salonId || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User or database not available.',
        });
        return;
      }
      
      // 1. Create Appointment
      const appointmentData = {
        salonId,
        customerId: customer.id,
        staffId: data.staffId,
        serviceIds: data.serviceIds,
        dateTime: new Date(),
        status: 'completed' as const,
        totalAmount: total,
      };
      
      const appointmentsRef = collection(firestore, `salons/${salonId}/appointments`);
      const appointmentRef = await addDoc(appointmentsRef, appointmentData);

      // 2. Create Payment
       const paymentData = {
        salonId,
        appointmentId: appointmentRef.id,
        method: data.paymentMethod,
        status: 'paid',
        amount: total,
        createdAt: new Date(),
       };

      const paymentsRef = collection(firestore, `salons/${salonId}/payments`);
      addDocumentNonBlocking(paymentsRef, paymentData);


      // Optimistic UI update
      toast({
        title: 'Checkout Complete!',
        description: `${customer.name} has been checked out successfully.`,
      });
      onCheckoutComplete();
    });
  }

  const isLoading = servicesLoading || staffLoading;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="serviceIds"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">Services</FormLabel>
                </div>
                <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border p-4">
                  {services?.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="serviceIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([
                                        ...(field.value || []),
                                        item.id,
                                      ])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item.id
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="flex w-full justify-between font-normal">
                              <span>{item.name}</span>
                              <span>{formatCurrency(item.price)}</span>
                            </FormLabel>
                          </FormItem>
                        );
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
                <FormLabel>Staff Member</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoading ? 'Loading...' : 'Select a staff member'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {staff?.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.name}
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
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Card className="bg-secondary">
             <CardContent className="p-4">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Total Amount:</span>
                    <span className="font-bold text-2xl">{formatCurrency(total)}</span>
                </div>
             </CardContent>
          </Card>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || isLoading}
        >
          {(isPending || isLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Complete Checkout
        </Button>
      </form>
    </Form>
  );
}
