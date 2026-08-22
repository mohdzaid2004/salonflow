'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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
  UserCheck
} from 'lucide-react';
import { collection, query, doc } from 'firebase/firestore';
import type { Service, Staff, Customer } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AppointmentItem {
  id: string;
  customer: string;
  phone: string;
  service: string;
  stylist: string;
  time: string;
  duration: string;
  price: number;
  status: 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  payment: 'Paid' | 'Pending';
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

  const staffQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);

  const customersQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);

  const { data: dbAppointments } = useCollection<any>(apptQuery);
  const { data: dbServices } = useCollection<Service>(servicesQuery);
  const { data: dbStaff } = useCollection<Staff>(staffQuery);
  const { data: dbCustomers } = useCollection<Customer>(customersQuery);

  const [localAppointments, setLocalAppointments] = useState<AppointmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isNewDialogOpen, setNewDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setNewDialogOpen(true);
    }
  }, [searchParams]);

  // New Appointment Form State
  const [formCustomer, setFormCustomer] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formService, setFormService] = useState('');
  const [formStylist, setFormStylist] = useState('');
  const [formTime, setFormTime] = useState('11:00 AM');
  const [formDuration, setFormDuration] = useState('45 min');
  const [formPrice, setFormPrice] = useState(500);

  // Auto-fill price when service selected
  const handleServiceSelect = (serviceName: string) => {
    setFormService(serviceName);
    const found = dbServices?.find(s => s.name === serviceName);
    if (found) {
      setFormPrice(found.price || 500);
      if ((found as any).duration) setFormDuration((found as any).duration);
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
        customer: a.customer || a.customerName || 'Client',
        phone: a.phone || '+91 98000 00000',
        service: a.service || 'Salon Service',
        stylist: a.stylist || 'Stylist',
        time: a.time || '11:00 AM',
        duration: a.duration || '45 min',
        price: Number(a.price) || 0,
        status: (a.status as any) || 'Confirmed',
        payment: (a.payment as any) || 'Pending',
      }));
    }
    return localAppointments;
  }, [dbAppointments, localAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const matchesSearch = 
        appt.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.phone.includes(searchQuery) ||
        appt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.stylist.toLowerCase().includes(searchQuery.toLowerCase());
      
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
    const newAppt = {
      customer: formCustomer,
      phone: formPhone || '+91 98000 00000',
      service: formService || 'Custom Service',
      stylist: formStylist || 'Assigned Stylist',
      time: formTime,
      duration: formDuration,
      price: Number(formPrice) || 0,
      status: 'Confirmed',
      payment: 'Pending',
    };

    if (firestore && salonId) {
      const apptRef = collection(firestore, `salons/${salonId}/appointments`);
      addDocumentNonBlocking(apptRef, {
        ...newAppt,
        salonId,
        createdAt: new Date().toISOString(),
      });
    }

    toast({
      title: 'Booking Created',
      description: `Appointment for ${formCustomer} has been scheduled.`,
    });

    setNewDialogOpen(false);
    setIsSubmitting(false);
    setFormCustomer('');
    setFormPhone('');
    setFormService('');
    setFormStylist('');
  };

  const handleUpdateStatus = (apptId: string, newStatus: 'In Progress' | 'Completed' | 'Cancelled') => {
    if (!firestore || !salonId) return;
    const apptDocRef = doc(firestore, `salons/${salonId}/appointments`, apptId);
    updateDocumentNonBlocking(apptDocRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: 'Status Updated',
      description: `Appointment status is now ${newStatus}.`,
    });
  };

  const handleProceedToBilling = (appt: AppointmentItem) => {
    router.push(`/dashboard/billing?customer=${encodeURIComponent(appt.customer)}&phone=${encodeURIComponent(appt.phone)}&service=${encodeURIComponent(appt.service)}&price=${appt.price}`);
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
            Real-time appointment schedule, client bookings, and salon chair management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isNewDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                title="Press N to create a new booking"
                className="group inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Appointment</span>
                <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-medium text-white/90">
                  N
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Create New Appointment</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateAppointment} className="space-y-3 pt-2">
                
                {/* Customer Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      list="existing-customers"
                      placeholder="e.g. Priya Sundaram"
                      value={formCustomer}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      required
                    />
                    <datalist id="existing-customers">
                      {dbCustomers?.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
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
                      list="existing-services"
                      placeholder="e.g. Haircut & Styling"
                      value={formService}
                      onChange={(e) => handleServiceSelect(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      required
                    />
                    <datalist id="existing-services">
                      {dbServices?.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>
                </div>

                {/* Stylist Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Stylist</label>
                  <div className="relative">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      list="existing-staff"
                      placeholder="e.g. Rahul Sharma"
                      value={formStylist}
                      onChange={(e) => setFormStylist(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                    <datalist id="existing-staff">
                      {dbStaff?.map(st => <option key={st.id} value={st.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Time Slot</label>
                    <input
                      type="text"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      placeholder="11:30 AM"
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Price (₹)</label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Scheduling Booking...' : 'Confirm Appointment'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Bookings</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.total}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Recorded in schedule</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Confirmed</span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-0.5">{stats.confirmed}</div>
          <span className="text-[10px] text-blue-600 font-medium">Ready for arrival</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">In Chair / Progress</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">{stats.inProgress}</div>
          <span className="text-[10px] text-purple-600 font-medium">Active styling sessions</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Completed</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.completed}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Finished visits</span>
        </div>
      </div>

      {/* Main Table / Mobile Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client, phone, service, or stylist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Confirmed', 'In Progress', 'Completed'].map((st) => (
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
                    <div className="text-[11px] text-slate-500">{appt.phone}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    appt.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : appt.status === 'In Progress'
                      ? 'bg-purple-50 text-purple-700 border border-purple-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {appt.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Service</span>
                    <span className="font-medium text-slate-800">{appt.service}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Stylist</span>
                    <span className="font-medium text-purple-700">{appt.stylist}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Time & Slot</span>
                    <span className="font-medium text-slate-700">{appt.time} ({appt.duration})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Price</span>
                    <span className="font-bold text-slate-900">₹{appt.price.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  {appt.status === 'Confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(appt.id, 'In Progress')}
                      className="flex-1 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Visit
                    </button>
                  )}

                  {appt.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(appt.id, 'Completed')}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleProceedToBilling(appt)}
                    className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Receipt className="w-3.5 h-3.5 text-purple-600" /> Bill Now
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No appointments found. Tap &quot;New Appointment&quot; above to create one.
            </div>
          )}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Customer</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Stylist</th>
                <th className="pb-3">Time</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Status</th>
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        {appt.stylist}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{appt.time}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">₹{appt.price.toLocaleString('en-IN')}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        appt.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : appt.status === 'In Progress'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {appt.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(appt.id, 'In Progress')}
                            className="px-2 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold transition-all"
                            title="Start Visit"
                          >
                            Start
                          </button>
                        )}
                        {appt.status === 'In Progress' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(appt.id, 'Completed')}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all"
                            title="Mark Completed"
                          >
                            Done
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleProceedToBilling(appt)}
                          className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition-all"
                          title="Generate Bill"
                        >
                          Bill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No appointments in database yet. Click &quot;New Appointment&quot; (or press N) to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
