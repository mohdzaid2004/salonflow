'use client';

import { useState } from 'react';
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
import { Loader2, Search, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Service, Staff, Appointment } from '@/lib/data';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { CreateBillForm } from '@/components/dashboard/home/create-bill-form';


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
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [showCreateBillDialog, setShowCreateBillDialog] = useState(false);
  
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [checkedInAppointments, setCheckedInAppointments] = useState<Appointment[]>([]);

  const salonId = user?.uid;

  // Fetch services and staff for the new bill form
  const servicesQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);
  const { data: services } = useCollection<Service>(servicesQuery);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);
  const { data: staff } = useCollection<Staff>(staffQuery);


  const searchForm = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { phone: '' },
  });

  const newCustomerForm = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { name: '', dob: '' },
  });
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const openBillDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCreateBillDialog(true);
  }

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
        // Customer found, open bill creation dialog
        const customerDoc = querySnapshot.docs[0];
        const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
        openBillDialog(customer);
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
      searchForm.reset();
    }
  };

  const handleCreateCustomer = async (data: NewCustomerFormValues) => {
     if (!firestore || !user) return;
    setIsCreating(true);
    const salonId = user.uid;

    try {
        const customerData: Omit<Customer, 'id' | 'visitHistory'> & { visitHistory?: string } = {
            salonId: salonId,
            name: data.name,
            phone: newCustomerPhone,
            visitHistory: '', // Initialize empty history
            ...(data.dob && { dob: data.dob }),
        };

        const customersRef = collection(firestore, `salons/${salonId}/customers`);
        const docRef = await addDoc(customersRef, customerData);
        
        const newCustomer: Customer = {
            id: docRef.id,
            ...customerData,
            visitHistory: ''
        };

        toast({
            title: 'Customer Registered!',
            description: `${data.name} has been added. Now create their bill.`,
        });
        
        setShowNewCustomerDialog(false);
        openBillDialog(newCustomer);

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

  const handleBillCreated = (appointment: Appointment) => {
    setCheckedInAppointments(prev => [appointment, ...prev]);
    toast({
        title: 'Customer Billed & Checked In',
        description: `${appointment.customerName} has been checked in.`,
    });
  }

  const getStaffName = (staffId: string) => staff?.find(s => s.id === staffId)?.name || 'Unknown';

  return (
    <>
      <div className={`grid w-full items-start gap-8 ${checkedInAppointments.length > 0 ? 'grid-cols-1 md:grid-cols-5' : 'flex justify-center'}`}>
          <Card className={`py-4 ${checkedInAppointments.length > 0 ? 'md:col-span-2' : 'w-full max-w-md'}`}>
            <CardHeader className="items-center text-center">
              <div className="mb-4 flex items-center gap-2">
                <Logo className="h-8 w-8 text-primary" />
                <span className="font-headline text-2xl font-bold">Your Salon</span>
              </div>
              <CardTitle className="font-headline text-3xl">
                Customer Check-in
              </CardTitle>
              <CardDescription>
                Enter a customer's phone number to create a bill.
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
          
          {checkedInAppointments.length > 0 && (
             <Card className="md:col-span-3 flex flex-col">
                <CardHeader>
                    <CardTitle>Today's Bills</CardTitle>
                     <CardDescription>
                      Customers who have been billed today.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {checkedInAppointments.map((appt) => (
                        <TableRow key={appt.id}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>
                                        {getInitials(appt.customerName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{appt.customerName}</div>
                                    <div className="text-sm text-muted-foreground">{appt.customerPhone}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{getStaffName(appt.staffId)}</TableCell>
                        <TableCell className="text-right font-medium">₹{appt.amountPaid}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
          )}

      </div>

      <div className="mt-12 flex w-full justify-center">
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard/overview">
            Go To Dashboard <ArrowRight className="ml-2" />
          </Link>
        </Button>
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
      
      {/* Create Bill Dialog */}
      <Dialog open={showCreateBillDialog} onOpenChange={setShowCreateBillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bill for {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              Select services, staff, and payment details for this visit.
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && services && staff && (
            <CreateBillForm
              customer={selectedCustomer}
              services={services}
              staff={staff}
              setOpen={setShowCreateBillDialog}
              onBillCreated={handleBillCreated}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
