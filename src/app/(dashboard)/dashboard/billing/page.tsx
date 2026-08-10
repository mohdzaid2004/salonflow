'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
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
import { 
  MoreHorizontal, 
  Search, 
  Printer, 
  MessageCircle, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  Trash2,
  AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { collection, query, where, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { Appointment, Staff, Salon, Service } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import * as XLSX from 'xlsx';

export default function BillingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const salonId = user?.uid;

  const [customerSearch, setCustomerSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  // 1. Fetch data from firestore
  const appointmentsQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/appointments`), where('status', '==', 'completed'));
  }, [firestore, salonId]);
  
  const staffQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);

  const invoicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/invoices`));
  }, [firestore, salonId]);
  
  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<any>(invoicesQuery);
  const { data: services } = useCollection<Service>(servicesQuery);
  const { data: salon } = useDoc<Salon>(salonDocRef);
  
  const isLoading = isLoadingAppointments || isLoadingStaff || isLoadingInvoices;

  const staffMap = useMemo(() => {
    if (!staff) return new Map();
    return new Map(staff.map(s => [s.id, s.name]));
  }, [staff]);

  const invoiceMap = useMemo(() => {
    if (!invoices) return new Map();
    return new Map(invoices.map(inv => [inv.id, inv])); // Map appointmentId -> invoice document
  }, [invoices]);
  
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    const getTimestampMillis = (date: any) => {
      if (!date) return 0;
      if (date instanceof Timestamp) return date.toMillis();
      if (typeof date.toMillis === 'function') return date.toMillis();
      if (typeof date.toDate === 'function') return date.toDate().getTime();
      if (date.seconds !== undefined) return date.seconds * 1000;
      const d = new Date(date);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    return appointments.filter(appt => {
        const customerName = appt.customerName || '';
        const customerMatch = customerSearch ? customerName.toLowerCase().includes(customerSearch.toLowerCase()) : true;
        const staffName = staffMap.get(appt.staffId)?.toLowerCase() || '';
        const staffMatch = staffSearch ? staffName.includes(staffSearch.toLowerCase()) : true;
        return customerMatch && staffMatch;
    }).sort((a, b) => {
      const aTime = getTimestampMillis(a.date);
      const bTime = getTimestampMillis(b.date);
      return bTime - aTime;
    });
  }, [appointments, customerSearch, staffSearch, staffMap]);

  const formatCurrency = (amount: number) => {
    const cleanAmount = isNaN(amount) || amount === undefined ? 0 : amount;
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(cleanAmount || 0);
    return <>&#8377;{formattedAmount}</>;
  };
  
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'PP, p');
    }
    if (typeof date.toDate === 'function') {
      return format(date.toDate(), 'PP, p');
    }
    if (date.seconds !== undefined) {
      return format(new Date(date.seconds * 1000), 'PP, p');
    }
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        return format(d, 'PP, p');
      }
    } catch (e) {
      // ignore
    }
    return 'N/A';
  };

  // ----------------------------------------------------
  // Core Invoice Operations Actions
  // ----------------------------------------------------

  const handlePrintInvoice = (appointment: Appointment) => {
    if (!salonId) return;
    const invoiceId = `${salonId}_${appointment.id}`;
    window.open(`/invoice/${invoiceId}`, '_blank');
  };

  const handleGenerateInvoice = async (appointment: Appointment, quiet = false, forceRegenerate = false) => {
    if (!salonId) return;
    if (!quiet) {
      toast({
        title: 'Generating PDF Invoice...',
        description: 'Compiling layout, calculating GST, and saving to Cloud Storage.',
      });
    }
    try {
      const response = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          appointmentId: appointment.id,
          sendWhatsApp: false,
          forceRegenerate
        })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        if (!quiet) {
          toast({
            title: 'Invoice Compiled Successfully',
            description: `Generated Invoice #${resData.invoiceNumber}.`,
          });
        }
        return resData.invoiceUrl;
      } else {
        throw new Error(resData.error || 'Server responded with failure');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err.message || 'Could not compile PDF invoice.',
      });
      return null;
    }
  };

  const handleSendWhatsApp = async (appointment: Appointment) => {
    if (!salonId) return;
    
    // Check if invoice exists, if not generate it first
    let existing = invoiceMap.get(appointment.id);
    if (!existing) {
      toast({
        title: 'Compiling Invoice first...',
        description: 'Creating invoice record before WhatsApp delivery.',
      });
      const generatedUrl = await handleGenerateInvoice(appointment, true);
      if (!generatedUrl) return;
      existing = invoiceMap.get(appointment.id);
    }

    toast({
      title: 'Sending invoice...',
      description: 'Dispatching invoice PDF and loyalty stats to WhatsApp.',
    });

    try {
      const response = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          appointmentId: appointment.id,
          sendWhatsApp: true
        })
      });
      const resData = await response.json();

      if (response.ok && resData.success) {
        if (!salon?.automatedWhatsappEnabled) {
          const invoiceNumber = resData.invoiceNumber || existing?.invoiceNumber || `INV-${appointment.id.slice(-6).toUpperCase()}`;
          const invoiceUrl = resData.invoiceUrl || existing?.invoiceUrl || '';
          
          const selectedServices = (appointment.serviceIds || []).map(id => {
            const s = services?.find(srv => srv.id === id);
            return s ? `- ${s.name}: ₹${s.price}` : null;
          }).filter(Boolean);
          const serviceList = selectedServices.length > 0 ? selectedServices.join('\n') : '- Service(s)';

          const paymentDate = format(appointment.date instanceof Timestamp ? appointment.date.toDate() : new Date(appointment.date as any), 'dd-MM-yyyy');
          const paymentTime = format(appointment.date instanceof Timestamp ? appointment.date.toDate() : new Date(appointment.date as any), 'hh:mm a');

          const feedbackId = `${salonId}_${appointment.id}`;
          const feedbackLink = `${window.location.origin}/feedback/${feedbackId}`;

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
            `📎 Your PDF Invoice is attached to this message.\n` +
            `${invoiceUrl ? `👉 View / Download PDF: ${invoiceUrl}\n` : ''}\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `⭐ Rate Your Experience\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `We hope you loved your visit!\n\n` +
            `Please take 30 seconds to rate your experience.\n\n` +
            `⭐⭐⭐⭐⭐\n\n` +
            `👉 ${feedbackLink}\n\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `Thank you for choosing ${salon?.name || 'our salon'} ❤️\n\n` +
            `📍 ${salon?.address || ''}\n` +
            `📞 ${salon?.phone || ''}`;

          const phone = `91${appointment.customerPhone}`;
          const encodedMessage = encodeURIComponent(message);
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;

          toast({
            title: 'Invoice Compiled Successfully',
            description: 'Automated Twilio WhatsApp is disabled. Click "Share" to send via WhatsApp Web/App.',
            action: (
              <ToastAction 
                altText="Share" 
                onClick={() => {
                  window.open(whatsappUrl, '_blank');
                }}
              >
                Share
              </ToastAction>
            ),
          });
        } else {
          toast({
            title: 'Notification Sent',
            description: `WhatsApp invoice successfully delivered to ${appointment.customerName}!`,
          });
        }
      } else {
        throw new Error(resData.error || 'Failed to dispatch via Twilio API');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'WhatsApp Dispatch Failed',
        description: err.message || 'Error occurred during WhatsApp delivery.',
      });
    }
  };

  const handleDownloadPDF = async (appointment: Appointment) => {
    const existing = invoiceMap.get(appointment.id);
    if (existing?.invoiceUrl) {
      window.open(existing.invoiceUrl, '_blank');
    } else {
      const url = await handleGenerateInvoice(appointment);
      if (url) window.open(url, '_blank');
    }
  };

  const handleDeleteInvoice = async (appointmentId: string) => {
    if (!salonId || !firestore) return;
    try {
      const docRef = doc(firestore, `salons/${salonId}/invoices`, appointmentId);
      await deleteDoc(docRef);
      toast({
        title: 'Invoice Deleted',
        description: 'Invoice metadata has been permanently removed.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to delete invoice metadata.',
      });
    }
  };

  // ----------------------------------------------------
  // Export Transaction Data to Excel File
  // ----------------------------------------------------
  const handleExportExcel = () => {
    if (filteredAppointments.length === 0) return;
    
    const excelData = filteredAppointments.map(appt => {
      const invoice = invoiceMap.get(appt.id);
      let dateStr = 'N/A';
      if (appt.date) {
        if (appt.date instanceof Timestamp) {
          dateStr = format(appt.date.toDate(), 'dd-MM-yyyy hh:mm a');
        } else if ((appt.date as any).seconds !== undefined) {
          dateStr = format(new Date((appt.date as any).seconds * 1000), 'dd-MM-yyyy hh:mm a');
        } else {
          const d = new Date(appt.date as any);
          if (!isNaN(d.getTime())) {
            dateStr = format(d, 'dd-MM-yyyy hh:mm a');
          }
        }
      }
      return {
        'Invoice Number': invoice?.invoiceNumber || `INV-${appt.id.slice(0,6).toUpperCase()}`,
        'Date': dateStr,
        'Customer Name': appt.customerName || 'N/A',
        'Customer Phone': appt.customerPhone || 'N/A',
        'Served By Staff': staffMap.get(appt.staffId) || 'N/A',
        'Gross Amount': appt.subtotal,
        'Points Redeemed': appt.pointsRedeemed || 0,
        'Final Paid (Net)': appt.amountPaid,
        'Payment Method': appt.paymentMethod,
        'PDF URL': invoice?.invoiceUrl || 'Not Generated'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

    // Auto-fit columns
    const max_widths = Object.keys(excelData[0] || {}).map(key => Math.max(key.length, 12));
    worksheet['!cols'] = max_widths.map(w => ({ wch: w + 2 }));

    XLSX.writeFile(workbook, `salonflow_billing_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast({
      title: 'Spreadsheet Exported',
      description: `Downloaded transaction list to Excel.`,
    });
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Billing & Invoice Management</CardTitle>
            <CardDescription>
              Monitor salon transaction histories, print thermal receipts, download PDF invoices, and trigger WhatsApp delivery logs.
            </CardDescription>
          </div>
          <Button onClick={handleExportExcel} disabled={filteredAppointments.length === 0} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row items-center gap-4">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by customer name..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                />
            </div>
             <div className="relative flex-1 w-full">
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
          <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Date / Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Billed By</TableHead>
                <TableHead>Net Total</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>GST (18%)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeleton()
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appt) => {
                  const invoice = invoiceMap.get(appt.id);
                  const gstCalculated = appt.amountPaid - (appt.amountPaid / 1.18);
                  return (
                    <TableRow key={appt.id}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {invoice?.invoiceNumber || `INV-${appt.id.slice(0,6).toUpperCase()} (Draft)`}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(appt.date)}</TableCell>
                      <TableCell className="font-medium text-xs">{appt.customerName}</TableCell>
                      <TableCell className="text-xs">{staffMap.get(appt.staffId) || 'N/A'}</TableCell>
                      <TableCell className="font-semibold text-xs">{formatCurrency(appt.amountPaid)}</TableCell>
                      <TableCell className="text-xs">{appt.paymentMethod}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{formatCurrency(gstCalculated)}</TableCell>
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
                                  Print Thermal Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDownloadPDF(appt)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleSendWhatsApp(appt)}>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Resend WhatsApp PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleGenerateInvoice(appt, false, true)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Regenerate Invoice
                              </DropdownMenuItem>
                              {invoice && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:bg-destructive/10" 
                                    onSelect={() => handleDeleteInvoice(appt.id)}
                                  >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Record
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No transactions found matching your criteria.
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
