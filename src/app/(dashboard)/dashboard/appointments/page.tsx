'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Scissors, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Phone,
  Command
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';

interface AppointmentItem {
  id: string;
  customer: string;
  phone: string;
  service: string;
  stylist: string;
  time: string;
  duration: string;
  price: number;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  payment: 'Paid' | 'Pending';
}

const INITIAL_APPOINTMENTS: AppointmentItem[] = [
  { id: 'APT-101', customer: 'Ananya Verma', phone: '+91 98234 11209', service: 'Keratin Smooth Treatment', stylist: 'Rahul Sharma', time: '10:00 AM', duration: '90 min', price: 4500, status: 'Completed', payment: 'Paid' },
  { id: 'APT-102', customer: 'Vikram Mehta', phone: '+91 98450 77123', service: 'Executive Haircut & Beard Grooming', stylist: 'Suresh Kumar', time: '11:30 AM', duration: '45 min', price: 950, status: 'Completed', payment: 'Paid' },
  { id: 'APT-103', customer: 'Priya Sundaram', phone: '+91 97112 44901', service: 'Hydra Glow Facial', stylist: 'Pooja Nair', time: '01:15 PM', duration: '60 min', price: 2800, status: 'Confirmed', payment: 'Paid' },
  { id: 'APT-104', customer: 'Rohan Gupta', phone: '+91 99018 33219', service: 'Deep Hair Spa & Scalp Therapy', stylist: 'Rahul Sharma', time: '02:00 PM', duration: '50 min', price: 1600, status: 'Confirmed', payment: 'Pending' },
  { id: 'APT-105', customer: 'Kavita Patel', phone: '+91 98765 43210', service: 'Global Highlights & Gloss', stylist: 'Suresh Kumar', time: '03:30 PM', duration: '120 min', price: 6200, status: 'Confirmed', payment: 'Paid' },
  { id: 'APT-106', customer: 'Deepak Chopra', phone: '+91 98112 33445', service: 'Classic Beard Trim & Wash', stylist: 'Rahul Sharma', time: '04:45 PM', duration: '30 min', price: 450, status: 'Pending', payment: 'Pending' },
  { id: 'APT-107', customer: 'Meera Kapoor', phone: '+91 98990 12345', service: 'Bridal Trial Makeup', stylist: 'Pooja Nair', time: '05:30 PM', duration: '90 min', price: 3500, status: 'Confirmed', payment: 'Paid' },
  { id: 'APT-108', customer: 'Arjun Singhania', phone: '+91 97654 32109', service: 'Hair Detox & Head Massage', stylist: 'Suresh Kumar', time: '06:30 PM', duration: '40 min', price: 800, status: 'Cancelled', payment: 'Pending' },
];

export default function AppointmentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const apptQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/appointments`));
  }, [firestore, salonId]);

  const { data: dbAppointments } = useCollection<any>(apptQuery);

  const searchParams = useSearchParams();
  const [localAppointments, setLocalAppointments] = useState<AppointmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isNewDialogOpen, setNewDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setNewDialogOpen(true);
    }
  }, [searchParams]);

  // New Appointment Form State
  const [formCustomer, setFormCustomer] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formService, setFormService] = useState('Haircut & Styling');
  const [formStylist, setFormStylist] = useState('Rahul Sharma');
  const [formTime, setFormTime] = useState('11:00 AM');
  const [formDuration, setFormDuration] = useState('45 min');
  const [formPrice, setFormPrice] = useState(950);

  const appointments = useMemo(() => {
    if (dbAppointments) {
      return dbAppointments.map((a: any) => ({
        id: a.id,
        customer: a.customer || a.customerName || 'Client',
        phone: a.phone || '+91 98000 00000',
        service: a.service || 'Haircut',
        stylist: a.stylist || 'Stylist',
        time: a.time || '11:00 AM',
        duration: a.duration || '45 min',
        price: a.price || 500,
        status: a.status || 'Confirmed',
        payment: a.payment || 'Paid',
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
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const pending = appointments.filter(a => a.status === 'Pending').length;
    return { total, confirmed, completed, pending };
  }, [appointments]);

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomer.trim()) {
      toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
      return;
    }

    const newAppt: AppointmentItem = {
      id: `APT-${Math.floor(100 + Math.random() * 900)}`,
      customer: formCustomer,
      phone: formPhone || '+91 98000 00000',
      service: formService,
      stylist: formStylist,
      time: formTime,
      duration: formDuration,
      price: formPrice,
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

    setLocalAppointments([newAppt, ...localAppointments]);
    setNewDialogOpen(false);
    setFormCustomer('');
    setFormPhone('');
    toast({
      title: 'Appointment Booked & Saved',
      description: `Appointment confirmed for ${newAppt.customer} at ${newAppt.time}.`,
    });
  };

  const handleStatusChange = (id: string, newStatus: AppointmentItem['status']) => {
    if (firestore && salonId) {
      const docRef = doc(firestore, `salons/${salonId}/appointments`, id);
      updateDocumentNonBlocking(docRef, { status: newStatus });
    }
    setLocalAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    toast({
      title: 'Status Updated',
      description: `Appointment marked as ${newStatus}.`,
    });
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Appointments & Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Real-time appointment schedule, customer bookings, stylist assignment, and slot management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isNewDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                title="Press N to create a new booking"
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Appointment</span>
                <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-medium text-white/90">
                  N
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Book New Appointment</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateAppointment} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Customer */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ananya Verma"
                      value={formCustomer}
                      onChange={(e) => setFormCustomer(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98234 11209"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  {/* Service */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Service</label>
                    <select
                      value={formService}
                      onChange={(e) => setFormService(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="Haircut & Styling">Haircut & Styling — ₹950</option>
                      <option value="Keratin Smooth Treatment">Keratin Smooth — ₹4,500</option>
                      <option value="Hydra Glow Facial">Hydra Glow Facial — ₹2,800</option>
                      <option value="Balayage & Color">Balayage & Color — ₹5,200</option>
                      <option value="Deep Hair Spa">Deep Hair Spa — ₹1,600</option>
                    </select>
                  </div>

                  {/* Stylist */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Stylist</label>
                    <select
                      value={formStylist}
                      onChange={(e) => setFormStylist(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="Rahul Sharma">Rahul Sharma (Senior Stylist)</option>
                      <option value="Pooja Nair">Pooja Nair (Skin Specialist)</option>
                      <option value="Suresh Kumar">Suresh Kumar (Stylist)</option>
                      <option value="Imran Khan">Imran Khan (Stylist)</option>
                    </select>
                  </div>

                  {/* Time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Time Slot</label>
                    <input
                      type="text"
                      placeholder="e.g. 11:30 AM"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Duration</label>
                    <input
                      type="text"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                </div>

                <button
                  type="submit"
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4"
                >
                  Confirm Booking
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Bookings</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
          <span className="text-[10px] text-emerald-600 font-medium">+4 new today</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Confirmed Slots</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">{stats.confirmed}</div>
          <span className="text-[10px] text-purple-600 font-medium">Ready for service</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Completed</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">{stats.completed}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Delivered today</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Pending</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">{stats.pending}</div>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting check-in</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, stylist, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Confirmed', 'Completed', 'Pending', 'Cancelled'].map((st) => (
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

        {/* Appointments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Customer</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Stylist</th>
                <th className="pb-3">Time & Duration</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Action</th>
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
                      <div className="font-semibold text-slate-900">{appt.time}</div>
                      <div className="text-[10px] text-slate-400">{appt.duration}</div>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">
                      ₹{appt.price.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        appt.status === 'Confirmed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : appt.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : appt.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {appt.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(appt.id, 'Completed')}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                          >
                            Mark Done
                          </button>
                        )}
                        {appt.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No appointments found matching your criteria.
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
