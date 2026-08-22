'use client';

import { useState, useMemo } from 'react';
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
  doc
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
import { 
  Loader2, 
  Search, 
  ArrowRight, 
  LayoutDashboard, 
  ChevronDown,
  Sparkles,
  Scissors
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Service, Staff, Appointment, Salon } from '@/lib/data';
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
  dob: z.string().optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;
type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

export default function HomePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [showCreateBillDialog, setShowCreateBillDialog] = useState(false);
  
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [checkedInAppointments, setCheckedInAppointments] = useState<Appointment[]>([]);

  const salonId = user?.uid;

  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId, isUserLoading]);
  const { data: salon } = useDoc<Salon>(salonDocRef);

  // Fetch services and staff for the new bill form
  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId, isUserLoading]);
  const { data: services } = useCollection<Service>(servicesQuery);

  const staffQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId, isUserLoading]);
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
  };

  const handleSearch = async ({ phone }: SearchFormValues) => {
    if (!firestore || !user) return;
    setIsSearching(true);
    const salonId = user.uid;
    
    try {
      const customersRef = collection(firestore, `salons/${salonId}/customers`);
      const q = query(customersRef, where('phone', '==', phone), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setNewCustomerPhone(phone);
        newCustomerForm.reset();
        setShowNewCustomerDialog(true);
      } else {
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
      const customerData: Omit<Customer, 'id' | 'visitHistory' | 'loyaltyPoints'> & { visitHistory: string[], loyaltyPoints: number } = {
        salonId: salonId,
        name: data.name,
        phone: newCustomerPhone,
        visitHistory: [],
        loyaltyPoints: 0,
        ...(data.dob && { dob: data.dob }),
      };

      const customersRef = collection(firestore, `salons/${salonId}/customers`);
      const docRef = await addDoc(customersRef, customerData);
      
      const newCustomer: Customer = {
        id: docRef.id,
        ...customerData,
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
  };

  const getStaffName = (staffId: string) => staff?.find(s => s.id === staffId)?.name || 'Unknown';

  const salonDisplayName = salon?.name || 'Toni & Guy';

  return (
    <div className="relative min-h-screen w-full bg-[#FAF9FD] font-sans flex flex-col justify-between overflow-x-hidden select-none">
      
      {/* Top Header Navigation Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center text-purple-700 shadow-sm">
            <Logo className="h-5 w-5 text-purple-700" />
          </div>
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {salonDisplayName}
          </span>
        </div>

        <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white/90 hover:bg-white text-slate-700 text-xs sm:text-sm font-semibold shadow-sm gap-2 transition-all">
          <Link href="/dashboard/overview">
            <LayoutDashboard className="w-4 h-4 text-purple-600" />
            Dashboard
          </Link>
        </Button>
      </header>

      {/* Main Centered Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className={`w-full max-w-5xl mx-auto grid items-center gap-8 ${checkedInAppointments.length > 0 ? 'grid-cols-1 lg:grid-cols-12' : 'flex justify-center'}`}>
          
          {/* Main Centered Check-in Card */}
          <div className={`${checkedInAppointments.length > 0 ? 'lg:col-span-6' : 'w-full max-w-[480px]'}`}>
            <Card className="w-full bg-white/95 rounded-[32px] p-6 sm:p-10 shadow-2xl border border-white/60 backdrop-blur-xl text-slate-900 text-center">
              
              {/* Lavender Avatar Icon */}
              <div className="flex justify-center mb-5">
                <div className="h-16 w-16 rounded-full bg-purple-50 border border-purple-100/80 flex items-center justify-center shadow-inner">
                  <Logo className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5 mb-6">
                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Customer Check-in
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Enter a customer&apos;s phone number to create a bill.
                </p>
              </div>

              {/* Check-in Form */}
              <Form {...searchForm}>
                <form onSubmit={searchForm.handleSubmit(handleSearch)} className="space-y-4">
                  
                  {/* Phone Input with +91 Prefix */}
                  <FormField
                    control={searchForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-transparent transition-all">
                          
                          {/* Flag and Code */}
                          <div className="h-12 px-3.5 bg-slate-50/80 border-r border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-700 select-none">
                            <span className="text-base">🇮🇳</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                            <span className="ml-1 text-slate-600">+91</span>
                          </div>

                          {/* Input */}
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Customer Phone Number"
                              className="h-12 border-0 bg-transparent text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 px-3.5"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="text-xs text-rose-500 text-left pt-0.5" />
                      </FormItem>
                    )}
                  />

                  {/* Primary Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSearching}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching Customer...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" /> Search / Check-in
                      </>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-100" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                      <span className="bg-white px-2.5">OR</span>
                    </div>
                  </div>

                  {/* Secondary Go To Dashboard Button */}
                  <Button
                    type="button"
                    asChild
                    variant="outline"
                    className="w-full h-11 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Link href="/dashboard/overview">
                      <LayoutDashboard className="w-4 h-4 text-purple-600" />
                      Go To Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>

                </form>
              </Form>

            </Card>
          </div>

          {/* Today's Bills Sidebar Card (Shows when customers are billed today) */}
          {checkedInAppointments.length > 0 && (
            <div className="lg:col-span-6 w-full">
              <Card className="w-full bg-white/95 rounded-[32px] p-6 shadow-2xl border border-white/60 backdrop-blur-xl">
                <CardHeader className="px-0 pt-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900">Today&apos;s Bills</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Customers billed during today&apos;s shift.
                      </CardDescription>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                      {checkedInAppointments.length} Billed
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white/60">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-700">Customer</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Staff</TableHead>
                          <TableHead className="text-right text-xs font-bold text-slate-700">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checkedInAppointments.map((appt) => (
                          <TableRow key={appt.id} className="hover:bg-purple-50/40 transition-colors">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 font-bold text-xs">
                                  <AvatarFallback>{getInitials(appt.customerName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">{appt.customerName}</p>
                                  <p className="text-[11px] text-slate-500 font-mono">{appt.customerPhone}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 font-medium">{getStaffName(appt.staffId)}</TableCell>
                            <TableCell className="text-right font-bold text-purple-700 text-sm">₹{appt.amountPaid}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-500 font-medium">
        &copy; {new Date().getFullYear()} {salonDisplayName}. All rights reserved.
      </footer>

      {/* New Customer Registration Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent 
          className="sm:max-w-md rounded-3xl p-6 bg-white shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">New Customer Registration</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Phone number +91 {newCustomerPhone} is not registered yet. Add their name to create a profile.
            </DialogDescription>
          </DialogHeader>
          <Form {...newCustomerForm}>
            <form onSubmit={newCustomerForm.handleSubmit(handleCreateCustomer)} className="space-y-4 pt-2">
              <FormField
                control={newCustomerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-bold text-slate-700 uppercase">Customer Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Priya Sharma" className="h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-rose-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={newCustomerForm.control}
                name="dob"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-bold text-slate-700 uppercase">Date of Birth (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-rose-500" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-sm shadow-md shadow-purple-600/20" disabled={isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register & Create Bill"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Create Bill Dialog */}
      <Dialog open={showCreateBillDialog} onOpenChange={setShowCreateBillDialog}>
        <DialogContent 
          className="max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Create Bill for {selectedCustomer?.name}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select services, staff, discounts and payment method for this visit.
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && services && staff && (
            <CreateBillForm
              customer={selectedCustomer}
              services={services}
              staff={staff}
              salon={salon}
              setOpen={setShowCreateBillDialog}
              onBillCreated={handleBillCreated}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
