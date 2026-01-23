'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MoreHorizontal, Search, Printer, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import type { Appointment, Staff, Salon } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useDoc } from '@/firebase';

export default function BillingPage({}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const salonId = user?.uid;

  const [customerSearch, setCustomerSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const appointmentsQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/appointments`), where('status', '==', 'completed'));
  }, [firestore, salonId]);
  
  const staffQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);
  
  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);
  const { data: salon } = useDoc<Salon>(salonDocRef);
  
  const isLoading = isLoadingAppointments || isLoadingStaff;

  const staffMap = useMemo(() => {
    if (!staff) return new Map();
    return new Map(staff.map(s => [s.id, s.name]));
  }, [staff]);
  
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(appt => {
        const customerMatch = customerSearch ? appt.customerName.toLowerCase().includes(customerSearch.toLowerCase()) : true;
        const staffName = staffMap.get(appt.staffId)?.toLowerCase() || '';
        const staffMatch = staffSearch ? staffName.includes(staffSearch.toLowerCase()) : true;
        return customerMatch && staffMatch;
    }).sort((a,b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
  }, [appointments, customerSearch, staffSearch, staffMap]);

  const formatCurrency = (amount: number) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount || 0);
    return <><span className="font-arial">₹</span>{formattedAmount}</>;
  };
  
  const formatDate = (date: unknown) => {
    if (!date) return '';
    return format((date as Timestamp).toDate(), 'PP, p');
  };
  
  const handleSendWhatsApp = (appointment: Appointment) => {
    if (!salonId || !staff) return;
    const staffName = staff.find(s => s.id === appointment.staffId)?.name || 'our staff';
    const feedbackId = `${salonId}_${appointment.id}`;
    const feedbackLink = `${window.location.origin}/feedback/${feedbackId}`;
    
    const message = `Hi ${appointment.customerName}, thanks for visiting ${salon?.name || 'our salon'}! Your bill for today is ₹${appointment.amountPaid}.
    
We'd love to hear your feedback on your service with ${staffName}. Please take a moment to leave a review:
${feedbackLink}
    
We look forward to seeing you again!`;

    const whatsappUrl = `https://web.whatsapp.com/send?phone=91${appointment.customerPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast({ title: "Opening WhatsApp...", description: "Please send the message in the new tab." });
  }

  const handlePrintInvoice = (appointment: Appointment) => {
    if (!salonId) return;
    const invoiceId = `${salonId}_${appointment.id}`;
    window.open(`/invoice/${invoiceId}`, '_blank');
  };

  const renderSkeleton = () => {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><div className="flex justify-end"><Skeleton className="h-8 w-8" /></div></TableCell>
      </TableRow>
    ));
  };
  
  return (
     <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and manage all past transactions and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by customer name..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                />
            </div>
             <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by staff name..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                />
            </div>
          </div>
          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeleton()
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell>{formatDate(appt.date)}</TableCell>
                    <TableCell className="font-medium">{appt.customerName}</TableCell>
                    <TableCell>{staffMap.get(appt.staffId) || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(appt.amountPaid)}</TableCell>
                    <TableCell>{appt.paymentMethod}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handlePrintInvoice(appt)}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleSendWhatsApp(appt)}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Send on WhatsApp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No bills found for the selected criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
