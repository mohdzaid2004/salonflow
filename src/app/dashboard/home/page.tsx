'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/data';

const searchSchema = z.object({
  phone: z.string().length(10, 'Please enter a valid 10-digit phone number.'),
});

const newCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  dob: z.string().optional(), // DOB is optional
});

type SearchFormValues = z.infer<typeof searchSchema>;
type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

export default function HomePage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const searchForm = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { phone: '' },
  });

  const newCustomerForm = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { name: '', dob: '' },
  });

  const handleSearch = async ({ phone }: SearchFormValues) => {
    if (!firestore || !user) return;
    setIsSearching(true);
    const salonId = user.uid;
    
    try {
      const customersRef = collection(firestore, `salons/${salonId}/customers`);
      const q = query(customersRef, where('phone', '==', phone), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No customer found, open new customer dialog
        setNewCustomerPhone(phone);
        newCustomerForm.reset();
        setShowNewCustomerDialog(true);
      } else {
        // Customer found, navigate to their page
        const customerId = querySnapshot.docs[0].id;
        router.push(`/dashboard/customers/${customerId}`);
      }
    } catch (error) {
      console.error("Error searching for customer:", error);
      toast({
        variant: 'destructive',
        title: 'Search Error',
        description: 'Could not perform search. Please try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateCustomer = async (data: NewCustomerFormValues) => {
     if (!firestore || !user) return;
    setIsCreating(true);
    const salonId = user.uid;

    try {
        const customerData: Omit<Customer, 'id'> = {
            salonId: salonId,
            name: data.name,
            phone: newCustomerPhone,
            visitHistory: '', // Initialize empty history
            ...(data.dob && { dob: data.dob }),
        };

        const customersRef = collection(firestore, `salons/${salonId}/customers`);
        const docRef = await addDoc(customersRef, customerData);

        toast({
            title: 'Customer Registered!',
            description: `${data.name} has been added.`,
        });
        
        // Close dialog and navigate to the new customer's page
        setShowNewCustomerDialog(false);
        router.push(`/dashboard/customers/${docRef.id}`);

    } catch (error) {
        console.error("Error creating customer:", error);
        toast({
            variant: 'destructive',
            title: 'Registration Failed',
            description: 'Could not create new customer. Please try again.',
        });
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <>
      <div className="flex h-full flex-col items-center justify-center">
        <div className="w-full max-w-lg">
          <Card className="py-4 mb-8">
            <CardHeader className="items-center text-center">
              <div className="mb-4 flex items-center gap-2">
                <Logo className="h-8 w-8 text-primary" />
                <span className="font-headline text-2xl font-bold">Your Salon</span>
              </div>
              <CardTitle className="font-headline text-3xl">
                Customer Check-in
              </CardTitle>
              <CardDescription>
                Enter a customer's phone number to begin.
              </CardDescription>
            </CardHeader>
            <Form {...searchForm}>
              <form onSubmit={searchForm.handleSubmit(handleSearch)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={searchForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Customer Phone Number</FormLabel>
                        <div className="flex items-center">
                          <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-background px-3 text-sm text-muted-foreground">
                            +91
                          </span>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Customer Phone Number"
                              className="rounded-l-none"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSearching}>
                    {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Search className="mr-2 h-4 w-4" /> Search / Check-in
                  </Button>
                </CardContent>
              </form>
            </Form>
          </Card>
        </div>
      </div>

      {/* New Customer Registration Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Customer Registration</DialogTitle>
            <DialogDescription>
              This phone number is not registered. Add their details to create a new customer profile.
            </DialogDescription>
          </DialogHeader>
          <Form {...newCustomerForm}>
            <form onSubmit={newCustomerForm.handleSubmit(handleCreateCustomer)} className="space-y-4">
              <FormField
                control={newCustomerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newCustomerForm.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Customer
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
