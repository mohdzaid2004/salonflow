'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  Plus, 
  IndianRupee, 
  CheckCircle2, 
  User, 
  Phone, 
  Scissors, 
  Play, 
  Receipt, 
  X,
  CreditCard,
  Smartphone,
  Tag,
  Check,
  Trash2
} from 'lucide-react';
import { collection, query, doc } from 'firebase/firestore';
import type { Service, Customer } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AnalogClockPicker } from '@/components/ui/analog-clock-picker';

interface AppointmentItem {
  id: string;
  customer: string;
  phone: string;
  service: string;
  time: string;
  date: string;
  price: number;
  status: 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  payment: 'Paid' | 'Pending';
  startedAt?: string;
  completedAt?: string;
}

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const apptQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/appointments`));
  }, [firestore, salonId]);

  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);

  const customersQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);

  const staffQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);

  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: dbAppointments } = useCollection<any>(apptQuery);
  const { data: dbServices } = useCollection<Service>(servicesQuery);
  const { data: dbCustomers } = useCollection<Customer>(customersQuery);
  const { data: dbStaff } = useCollection<any>(staffQuery);
  const { data: salon } = useDoc<any>(salonDocRef);

  const [localAppointments, setLocalAppointments] = useState<AppointmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isNewDialogOpen, setNewDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Confirmation Modal State
  const [bookedSuccessAppt, setBookedSuccessAppt] = useState<{
    bookingId: string;
    customer: string;
    phone: string;
    service: string;
    staff: string;
    date: string;
    time: string;
    price: number;
    status: string;
  } | null>(null);

  // Clock / Time Picker Modal State
  const [isClockPickerOpen, setClockPickerOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('30');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Payment & Auto-Billing Modal State
  const [payingAppt, setPayingAppt] = useState<AppointmentItem | null>(null);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Card' | 'Cash'>('UPI');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Cancel / Delete Modal State
  const [isCancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedApptToCancel, setSelectedApptToCancel] = useState<AppointmentItem | null>(null);

  const handleOpenCancel = (appt: AppointmentItem) => {
    setSelectedApptToCancel(appt);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!selectedApptToCancel) return;
    if (firestore && salonId) {
      const apptRef = doc(firestore, `salons/${salonId}/appointments`, selectedApptToCancel.id);
      deleteDocumentNonBlocking(apptRef);
    } else {
      setLocalAppointments(prev => prev.filter(a => a.id !== selectedApptToCancel.id));
    }
    toast({
      title: 'Booking Cancelled',
      description: `Appointment for ${selectedApptToCancel.customer} has been cancelled.`,
    });
    setCancelDialogOpen(false);
  };

  // New Appointment Form State
  const [formCustomer, setFormCustomer] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formService, setFormService] = useState('');
  const [formStaff, setFormStaff] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('10:30 AM');
  const [formPrice, setFormPrice] = useState(500);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setNewDialogOpen(true);
    }
  }, [searchParams]);

  // Handle setting time from clock popup
  const handleConfirmClockTime = () => {
    const formattedTime = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    setFormTime(formattedTime);
    setClockPickerOpen(false);
  };

  // Auto-fill price when service selected
  const handleServiceSelect = (serviceName: string) => {
    setFormService(serviceName);
    const found = dbServices?.find(s => s.name === serviceName);
    if (found) {
      setFormPrice(found.price || 500);
    }
  };

  // Auto-fill phone when existing customer selected
  const handleCustomerSelect = (customerName: string) => {
    setFormCustomer(customerName);
    const found = dbCustomers?.find(c => c.name === customerName);
    if (found && found.phone) {
      setFormPhone(found.phone);
    }
  };

  const appointments: AppointmentItem[] = useMemo(() => {
    if (dbAppointments) {
      return dbAppointments.map((a: any) => ({
        id: a.id,
        bookingId: a.bookingId || `BK-${a.id.slice(0, 6).toUpperCase()}`,
        customer: a.customer || a.customerName || 'Customer',
        phone: a.phone || a.customerPhone || '+91 98000 00000',
        service: a.service || (a.services && Array.isArray(a.services) ? a.services.map((s: any) => s.name).join(', ') : 'Salon Service'),
        staff: a.staff || a.staffName || a.stylist || 'Assigned Stylist',
        time: a.time || '10:30 AM',
        date: a.date || 'Today',
        price: Number(a.price ?? a.amountPaid ?? a.finalAmount ?? 350),
        status: (a.status as any) || 'Confirmed',
        payment: (a.payment || a.paymentStatus || 'Pending') as any,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      }));
    }
    return localAppointments;
  }, [dbAppointments, localAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const matchesSearch = 
        appt.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.phone.includes(searchQuery) ||
        appt.service.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || appt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'Confirmed').length;
    const inProgress = appointments.filter(a => a.status === 'In Progress').length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    return { total, confirmed, inProgress, completed };
  }, [appointments]);

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomer.trim()) {
      toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const bookingId = `BK-${Date.now().toString().slice(-6)}`;
    const selectedStaffName = formStaff || (dbStaff && dbStaff[0] ? dbStaff[0].name : 'Assigned Stylist');
    const matchingCust = dbCustomers?.find(c => c.name.toLowerCase() === formCustomer.toLowerCase() || (formPhone && c.phone === formPhone));
    const matchingStaff = dbStaff?.find(s => s.name.toLowerCase() === selectedStaffName.toLowerCase());

    const newAppt = {
      bookingId,
      customer: formCustomer,
      customerName: formCustomer,
      customerId: matchingCust?.id || '',
      phone: formPhone || '+91 98000 00000',
      customerPhone: formPhone || '+91 98000 00000',
      service: formService || 'Salon Service',
      staff: selectedStaffName,
      staffName: selectedStaffName,
      stylist: selectedStaffName,
      staffId: matchingStaff?.id || '',
      date: formDate,
      time: formTime,
      price: Number(formPrice) || 350,
      status: 'Confirmed',
      payment: 'Pending',
      paymentStatus: 'Pending',
    };

    if (firestore && salonId) {
      const apptRef = collection(firestore, `salons/${salonId}/appointments`);
      addDocumentNonBlocking(apptRef, {
        ...newAppt,
        salonId,
        createdAt: new Date().toISOString(),
      });
    }

    setBookedSuccessAppt({
      bookingId,
      customer: formCustomer,
      phone: formPhone || '+91 98000 00000',
      service: formService || 'Salon Service',
      staff: selectedStaffName,
      date: formDate,
      time: formTime,
      price: Number(formPrice) || 350,
      status: 'Confirmed',
    });

    toast({
      title: 'Appointment Booked Successfully 🎉',
      description: `Booking ${bookingId} confirmed for ${formCustomer}.`,
    });

    setNewDialogOpen(false);
    setIsSubmitting(false);
    setFormCustomer('');
    setFormPhone('');
    setFormService('');
    setFormStaff('');
  };

  const handleStartVisit = (appt: AppointmentItem) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (firestore && salonId) {
      const apptRef = doc(firestore, `salons/${salonId}/appointments`, appt.id);
      updateDocumentNonBlocking(apptRef, {
        status: 'In Progress',
        startedAt: timestamp,
      });
    }
    toast({
      title: 'Visit Started',
      description: `${appt.customer} is now in chair for ${appt.service}.`,
    });
  };

  const handleCompleteAndPay = async () => {
    if (!payingAppt) return;
    setIsProcessingPayment(true);

    const subtotal = payingAppt.price;
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const totalPayable = Math.max(0, subtotal - discountAmount);
    const now = new Date();
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const invoiceNo = `INV-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const pointsEarned = Math.round(totalPayable * 0.1);
    const matchingCust = dbCustomers?.find(c => c.name.toLowerCase() === payingAppt.customer.toLowerCase() || c.phone === payingAppt.phone);
    const currentLoyaltyBalance = ((matchingCust as any)?.loyaltyPoints || 0) + pointsEarned;

    const newInvoice = {
      invoiceNo,
      appointmentId: payingAppt.id,
      customer: payingAppt.customer,
      phone: payingAppt.phone,
      items: payingAppt.service,
      subtotal,
      discount: discountAmount,
      total: totalPayable,
      method: paymentMode,
      status: 'Paid',
      pointsEarned,
      loyaltyBalance: currentLoyaltyBalance,
      date: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
    };

    if (firestore && salonId) {
      // 1. Store automatic billing record in Firestore invoices collection
      const invoiceRef = collection(firestore, `salons/${salonId}/invoices`);
      addDocumentNonBlocking(invoiceRef, {
        ...newInvoice,
        salonId,
      });

      // 2. Update appointment status to Completed & Paid
      const apptRef = doc(firestore, `salons/${salonId}/appointments`, payingAppt.id);
      updateDocumentNonBlocking(apptRef, {
        status: 'Completed',
        payment: 'Paid',
        completedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        invoiceNo,
        totalPaid: totalPayable,
        paymentMode,
      });

      // 3. Update customer loyalty balance & lifetime spend
      if (matchingCust?.id) {
        const custDocRef = doc(firestore, `salons/${salonId}/customers`, matchingCust.id);
        updateDocumentNonBlocking(custDocRef, {
          loyaltyPoints: currentLoyaltyBalance,
          totalSpent: ((matchingCust as any)?.totalSpent || 0) + totalPayable,
          visits: ((matchingCust as any)?.visits || 0) + 1,
          lastVisit: now.toISOString().split('T')[0],
        });
      }
    }

    // 4. Automated WhatsApp message dispatch using the EXACT template structure with PDF attachment
    const cleanPhone = payingAppt.phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://salonflow--salonindia-74cbb.us-east4.hosted.app';
    const feedbackUrl = `${baseUrl}/feedback/${salonId || 'default'}_${payingAppt.id}`;
    const invoicePdfUrl = `${baseUrl}/api/invoices/${salonId || 'default'}_${payingAppt.id}/pdf`;
    const salonName = salon?.name || 'SalonFlow';
    const salonPhone = salon?.phone || '+91 98765 43210';
    const salonAddress = salon?.address || '';

    const messageText = `💜 Thank You for Visiting ${salonName}!

Hi ${payingAppt.customer} 👋

We hope you enjoyed your ${payingAppt.service} experience with us! ✨

Your payment of ₹${totalPayable.toLocaleString('en-IN')} has been successfully received. 🎉

🧾 Invoice: ${invoiceNo}
💳 Payment: ${paymentMode}
💰 Amount Paid: ₹${totalPayable.toLocaleString('en-IN')}

🎁 Loyalty Points Earned: ${pointsEarned}
⭐ Loyalty Balance: ${currentLoyaltyBalance} Points

📎 Your invoice is attached to this WhatsApp message.

⭐ How was your experience?

We'd love to hear your feedback.
It only takes a few seconds. ❤️

👉 Rate Your Experience:
${feedbackUrl}

Your feedback helps us improve and serve you better. 💫

Thank you for choosing ${salonName}! ❤️

We look forward to welcoming you again.

${salonAddress ? `📍 ${salonAddress}\n` : ''}📞 ${salonPhone}`;

    try {
      await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: targetPhone, 
          message: messageText,
          mediaUrl: invoicePdfUrl 
        }),
      });
    } catch (e) {
      // Non-fatal
    }

    setIsProcessingPayment(false);
    setPayingAppt(null);
    toast({
      title: 'Payment Confirmed & Billed',
      description: `₹${totalPayable.toLocaleString('en-IN')} collected via ${paymentMode}. Loyalty: +${pointsEarned} pts. Invoice ${invoiceNo} stored.`,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Real-time appointment schedule, active chair visits, and automatic billing checkout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isNewDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Booking</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Create New Booking</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateAppointment} className="space-y-3.5 pt-2">
                <div className="space-y-3">
                  
                  {/* Customer Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        list="cust-datalist"
                        placeholder="e.g. Priya Sharma"
                        value={formCustomer}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                        required
                      />
                      <datalist id="cust-datalist">
                        {dbCustomers?.map(c => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* Customer Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">WhatsApp Phone</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      />
                    </div>
                  </div>

                  {/* Service Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Service <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Scissors className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        list="srv-datalist"
                        placeholder="Select service..."
                        value={formService}
                        onChange={(e) => handleServiceSelect(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                        required
                      />
                      <datalist id="srv-datalist">
                        {dbServices?.map(s => <option key={s.id} value={s.name} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* Staff Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Assign Staff / Stylist
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        list="staff-datalist"
                        placeholder="Select or enter staff member..."
                        value={formStaff}
                        onChange={(e) => setFormStaff(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      />
                      <datalist id="staff-datalist">
                        {dbStaff?.map(s => <option key={s.id} value={s.name} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* Date & Time Picker */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Time</label>
                      <button
                        type="button"
                        onClick={() => setClockPickerOpen(true)}
                        className="w-full h-8 px-2.5 rounded-xl text-xs bg-purple-50/70 border border-purple-200 text-purple-900 font-bold flex items-center justify-between hover:bg-purple-100 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>{formTime}</span>
                        </span>
                        <span className="text-[10px] text-purple-700 uppercase">Change</span>
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Price (INR)</label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600 font-bold text-slate-900"
                      />
                    </div>
                  </div>

                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Scheduling...' : 'Confirm Booking'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Appointment Booked Successfully Dialog */}
      {bookedSuccessAppt && (
        <Dialog open={!!bookedSuccessAppt} onOpenChange={(open) => !open && setBookedSuccessAppt(null)}>
          <DialogContent className="max-w-[420px] rounded-3xl p-6 bg-white shadow-2xl space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
            </div>

            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1.5">
                <span>✨</span>
                <span>Appointment Booked Successfully</span>
              </DialogTitle>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Booking ID:</span>
                <span className="font-mono font-bold text-purple-700">{bookedSuccessAppt.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900">{bookedSuccessAppt.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Phone:</span>
                <span className="font-mono text-slate-700">{bookedSuccessAppt.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Service:</span>
                <span className="font-semibold text-slate-900">{bookedSuccessAppt.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-medium text-slate-800">{bookedSuccessAppt.date} • {bookedSuccessAppt.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {bookedSuccessAppt.status}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Price:</span>
                <span className="text-sm font-extrabold text-purple-700">₹{bookedSuccessAppt.price.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBookedSuccessAppt(null)}
              className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all"
            >
              Done & View Schedule
            </button>
          </DialogContent>
        </Dialog>
      )}

      {/* Analog Clock / Time Picker Popup Dialog */}
      <Dialog open={isClockPickerOpen} onOpenChange={setClockPickerOpen}>
        <DialogContent className="max-w-[360px] rounded-3xl p-5 bg-white shadow-2xl text-center">
          <AnalogClockPicker
            initialTime={formTime}
            onConfirm={(time) => {
              setFormTime(time);
              setClockPickerOpen(false);
            }}
            onCancel={() => setClockPickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Instant Checkout & Automatic Billing Modal */}
      {payingAppt && (
        <Dialog open={!!payingAppt} onOpenChange={(open) => !open && setPayingAppt(null)}>
          <DialogContent className="max-w-[420px] rounded-3xl p-5 sm:p-6 bg-white shadow-2xl space-y-4">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Checkout & Automatic Billing
              </DialogTitle>
            </DialogHeader>

            <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-100 space-y-1 text-xs">
              <div className="font-bold text-slate-900 text-sm">{payingAppt.customer}</div>
              <div className="text-slate-500">{payingAppt.service} • {payingAppt.phone}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Card', 'Cash'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        paymentMode === mode
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
                />
              </div>

              {/* Bill Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{payingAppt.price.toLocaleString('en-IN')}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-₹{Math.round((payingAppt.price * discountPercent) / 100).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>Total Payable:</span>
                  <span className="text-purple-700">
                    ₹{Math.max(0, payingAppt.price - Math.round((payingAppt.price * discountPercent) / 100)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessingPayment}
              onClick={handleCompleteAndPay}
              className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
            >
              {isProcessingPayment ? 'Processing & Billing...' : 'Confirm Payment & Auto-Bill'}
            </button>
          </DialogContent>
        </Dialog>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Bookings</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.total}</div>
          <span className="text-[10px] text-purple-600 font-medium">All visits</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Confirmed</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">{stats.confirmed}</div>
          <span className="text-[10px] text-purple-600 font-medium">Scheduled</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">In Chair</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">{stats.inProgress}</div>
          <span className="text-[10px] text-amber-600 font-medium">Active visits</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Completed & Billed</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.completed}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Settled</span>
        </div>
      </div>

      {/* Main Table / Mobile Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Interactive Cards (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appt) => (
              <div key={appt.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{appt.customer}</div>
                    <div className="text-[10px] text-slate-400">{appt.phone}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    appt.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                    'bg-purple-50 text-purple-700 border border-purple-100'
                  }`}>
                    {appt.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Service</span>
                    <span className="font-medium text-slate-800 truncate block">{appt.service}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Scheduled Time</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-600" />
                      {appt.time}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Price</span>
                    <span className="font-bold text-slate-900">₹{appt.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Payment</span>
                    <span className={`font-semibold ${appt.payment === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {appt.payment}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  {appt.status === 'Confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleStartVisit(appt)}
                      className="flex-1 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Visit
                    </button>
                  )}

                  {appt.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => setPayingAppt(appt)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Complete & Auto-Bill (₹{appt.price})
                    </button>
                  )}

                  {appt.status === 'Completed' && (
                    <span className="flex-1 text-[11px] font-bold text-emerald-700 flex items-center gap-1 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Billed & Paid
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenCancel(appt)}
                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors shadow-2xs"
                    title="Cancel Booking"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No appointments found. Tap &quot;New Booking&quot; above to create one.
            </div>
          )}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Client</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Time</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div className="font-semibold text-slate-900">{appt.customer}</div>
                      <div className="text-[10px] text-slate-400">{appt.phone}</div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-800">{appt.service}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock className="w-3 h-3 text-purple-600" />
                        <span>{appt.time}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">₹{appt.price.toLocaleString('en-IN')}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        appt.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                        'bg-purple-50 text-purple-700 border border-purple-100'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        appt.payment === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {appt.payment}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {appt.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleStartVisit(appt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[10px] shadow-2xs transition-all"
                          >
                            <Play className="w-3 h-3 fill-current" /> Start Visit
                          </button>
                        )}

                        {appt.status === 'In Progress' && (
                          <button
                            type="button"
                            onClick={() => setPayingAppt(appt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-all"
                          >
                            <Check className="w-3 h-3" /> Complete & Auto-Bill (₹{appt.price})
                          </button>
                        )}

                        {appt.status === 'Completed' && (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Billed & Paid
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenCancel(appt)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors shadow-2xs"
                          title="Cancel Booking"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No appointments in database yet. Click &quot;New Booking&quot; above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Cancel Appointment Alert Dialog */}
      {selectedApptToCancel && (
        <AlertDialog open={isCancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent className="max-w-[400px] rounded-3xl p-5 bg-white border border-slate-200 text-slate-900 space-y-3">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-extrabold text-slate-900">
                Cancel Appointment Booking?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Are you sure you want to cancel the booking for <strong className="text-slate-900">{selectedApptToCancel.customer}</strong> ({selectedApptToCancel.service} at {selectedApptToCancel.time})?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-2 flex items-center justify-end gap-2">
              <AlertDialogCancel className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                Keep Booking
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCancel}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Cancel Booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
