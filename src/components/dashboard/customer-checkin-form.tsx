'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import type { Customer } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Please enter a valid 10-digit phone number.')
    .max(10, 'Please enter a valid 10-digit phone number.'),
});

const newCustomerSchema = z.object({
  phone: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  dob: z.string().optional(),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

export function CustomerCheckinForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const salonId = user?.uid;

  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [searchedPhone, setSearchedPhone] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'create' | 'found'>('search');

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  });

  const newCustomerForm = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      phone: '',
      name: '',
      dob: '',
    },
  });

  async function onPhoneSubmit(data: PhoneFormValues) {
    if (!salonId || !firestore) return;
    setIsSearching(true);
    setFoundCustomer(null);

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
        setFoundCustomer({ id: customerDoc.id, ...customerDoc.data() } as Customer);
        setStep('found');
      } else {
        setSearchedPhone(data.phone);
        newCustomerForm.setValue('phone', data.phone);
        setStep('create');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to search for customer.',
      });
    } finally {
      setIsSearching(false);
    }
  }

  function onNewCustomerSubmit(data: NewCustomerFormValues) {
    if (!salonId || !firestore) return;
    setIsCreating(true);

    const customerData = {
      ...data,
      salonId,
      visitHistory: '', // Initialize visit history
    };

    const customersRef = collection(firestore, `salons/${salonId}/customers`);
    addDocumentNonBlocking(customersRef, customerData);

    toast({
      title: 'Customer Created',
      description: `${data.name} has been added to your customers.`,
    });
    setIsCreating(false);
    setOpen(false);
  }

  const renderSearchStep = () => (
    <Form {...phoneForm}>
      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
        <FormField
          control={phoneForm.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="9876543210" {...field} />
              </FormControl>
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
          Search
        </Button>
      </form>
    </Form>
  );
  
  const renderFoundStep = () => (
    <Card className="border-0 shadow-none">
      <CardHeader className="items-center text-center">
         <Avatar className="h-16 w-16">
          <AvatarFallback className="text-2xl">
            {foundCustomer?.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <CardTitle>{foundCustomer?.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
         <p className="text-muted-foreground">Checked in successfully!</p>
        <Button className="mt-4 w-full" onClick={() => setOpen(false)}>Done</Button>
      </CardContent>
    </Card>
  );

  const renderCreateStep = () => (
    <Form {...newCustomerForm}>
      <form onSubmit={newCustomerForm.handleSubmit(onNewCustomerSubmit)} className="space-y-4">
        <FormField
          control={newCustomerForm.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} readOnly disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={newCustomerForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter customer's name" {...field} />
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
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
             <UserPlus className="mr-2 h-4 w-4" />
          )}
          Create New Customer
        </Button>
      </form>
    </Form>
  );

  return (
    <div>
      {step === 'search' && renderSearchStep()}
      {step === 'found' && renderFoundStep()}
      {step === 'create' && renderCreateStep()}
    </div>
  );
}
