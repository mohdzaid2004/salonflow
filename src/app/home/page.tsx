'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Loader2, PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CustomerCheckinForm } from '@/components/dashboard/customer-checkin-form';
import { AppointmentForm } from '@/components/dashboard/appointment-form';
import { CalendarView } from '@/components/dashboard/calendar-view';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/dashboard/user-nav';
import Link from 'next/link';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Salon, Customer } from '@/lib/data';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckoutForm } from '@/components/dashboard/checkout-form';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Please enter a valid 10-digit phone number.')
    .max(10, 'Please enter a valid 10-digit phone number.'),
});
type PhoneFormValues = z.infer<typeof phoneSchema>;


export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAppointmentOpen, setAppointmentOpen] = useState(false);
  const [isNewCustomerOpen, setNewCustomerOpen] = useState(false);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [checkedInCustomers, setCheckedInCustomers] = useState<Customer[]>([]);
  const [customerForCheckout, setCustomerForCheckout] = useState<Customer | null>(null);

  const salonId = user?.uid;
  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);
  const { data: salon, isLoading: isSalonLoading } = useDoc<Salon>(salonDocRef);

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleCustomerCheckedIn = (customer: Customer) => {
    // Avoid adding duplicate customers to the list
    if (!checkedInCustomers.some(c => c.id === customer.id)) {
      setCheckedInCustomers(prev => [customer, ...prev]);
    }
    setNewCustomerOpen(false); // Close the 'new customer' dialog if it was open
  };

  const handleCheckout = (customer: Customer) => {
    setCustomerForCheckout(customer);
    setCheckoutOpen(true);
  };
  
  const handleCheckoutComplete = (customerId: string) => {
    setCheckedInCustomers(prev => prev.filter(c => c.id !== customerId));
    setCheckoutOpen(false);
    setCustomerForCheckout(null);
  };

  const handleCheckoutCancel = (customerId: string) => {
    setCheckedInCustomers(prev => prev.filter(c => c.id !== customerId));
    setCheckoutOpen(false);
    setCustomerForCheckout(null);
     toast({
      variant: 'destructive',
      title: 'Check-in Cancelled',
      description: `${customerForCheckout?.name} has been removed from active check-ins.`,
    });
  };


  async function onPhoneSubmit(data: PhoneFormValues) {
    if (!salonId || !firestore) return;
    setIsSearching(true);

    try {
      const customersRef = collection(firestore, `salons/${salonId}/customers`);
      const q = query(
        customersRef,
        where('phone', '==', data.phone),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
        handleCustomerCheckedIn(customer);
        toast({
          title: 'Customer Found',
          description: `${customer.name} has been checked in.`,
        });
        phoneForm.reset();
      } else {
        // Not found, open dialog to create new customer
        setNewCustomerPhone(data.phone);
        setNewCustomerOpen(true);
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to search for customer.',
      });
    } finally {
      setIsSearching(false);
    }
  }


  if (isUserLoading || !user || isSalonLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardLink = salon?.appointmentsEnabled ? '/dashboard' : '/dashboard/services';

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Link href={dashboardLink} className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold">{salon?.name || 'SalonFlow'}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <UserNav />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className={cn("grid grid-cols-1 gap-8", salon?.appointmentsEnabled && "lg:grid-cols-3")}>
          <div className={cn("flex flex-col gap-4 lg:col-span-1", !salon?.appointmentsEnabled && "mx-auto w-full max-w-md")}>
             <Card>
              <CardHeader>
                <CardTitle>Check In</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Phone Number</FormLabel>
                          <div className="flex items-center">
                            <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-background px-3 text-sm text-muted-foreground">
                              +91
                            </span>
                            <FormControl>
                              <Input
                                placeholder="9876543210"
                                {...field}
                                className="rounded-l-none"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      Search / Check-in
                    </Button>
                  </form>
                </Form>
                 {salon?.appointmentsEnabled && (
                   <>
                    <div className="my-4 flex items-center gap-2">
                        <div className="flex-1 border-t"></div>
                        <span className="text-xs text-muted-foreground">OR</span>
                        <div className="flex-1 border-t"></div>
                    </div>
                    <Dialog
                        open={isAppointmentOpen}
                        onOpenChange={setAppointmentOpen}
                    >
                        <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Book a New Appointment
                        </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>New Appointment</DialogTitle>
                        </DialogHeader>
                        <AppointmentForm setOpen={setAppointmentOpen} />
                        </DialogContent>
                    </Dialog>
                   </>
                )}
              </CardContent>
            </Card>

            {checkedInCustomers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Check-ins</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {checkedInCustomers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.phone}</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleCheckout(customer)}>
                        Checkout
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="mt-4 text-center text-sm">
                <Link href={dashboardLink} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                    {salon?.appointmentsEnabled ? 'Go to Full Dashboard' : 'Manage Salon Features'}
                </Link>
            </div>
          </div>

          {salon?.appointmentsEnabled && (
            <div className="lg:col-span-2">
                <CalendarView />
            </div>
          )}
        </div>
      </main>

       {/* Dialog for creating a new customer */}
      <Dialog open={isNewCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerCheckinForm
            setOpen={setNewCustomerOpen}
            onCustomerCheckedIn={handleCustomerCheckedIn}
            initialPhone={newCustomerPhone}
            startStep="create"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog for checkout */}
       <Dialog open={isCheckoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout: {customerForCheckout?.name}</DialogTitle>
            <CardDescription>Select the services provided and complete the checkout.</CardDescription>
          </DialogHeader>
          {customerForCheckout && (
            <CheckoutForm
              customer={customerForCheckout}
              onCheckoutComplete={() => handleCheckoutComplete(customerForCheckout.id)}
              onCancel={() => handleCheckoutCancel(customerForCheckout.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
