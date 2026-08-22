'use client';

import { useState, useMemo } from 'react';
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
  Phone
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  const [appointments, setAppointments] = useState<AppointmentItem[]>(INITIAL_APPOINTMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isNewDialogOpen, setNewDialogOpen] = useState(false);
  const { toast } = useToast();

  // New Appointment Form State
  const [formCustomer, setFormCustomer] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formService, setFormService] = useState('Haircut & Styling');
  const [formStylist, setFormStylist] = useState('Rahul Sharma');
  const [formTime, setFormTime] = useState('11:00 AM');
  const [formDuration, setFormDuration] = useState('45 min');
  const [formPrice, setFormPrice] = useState(950);

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

    setAppointments([newAppt, ...appointments]);
    setNewDialogOpen(false);
    setFormCustomer('');
    setFormPhone('');
    toast({
      title: 'Appointment Booked',
      description: `Appointment confirmed for ${newAppt.customer} at ${newAppt.time}.`,
    });
  };

  const updateStatus = (id: string, newStatus: AppointmentItem['status']) => {
    setAppointments(appointments.map(a => a.id === id ? { ...a, status: newStatus } : a));
    toast({ title: 'Status Updated', description: `Appointment marked as ${newStatus}.` });
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage your daily salon bookings, stylist schedules, and client visits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isNewDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Appointment</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Book New Appointment</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateAppointment} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Customer Name */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={formCustomer}
                        onChange={(e) => setFormCustomer(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      />
                    </div>
                  </div>

                  {/* Assigned Stylist */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Stylist</label>
                    <select
                      value={formStylist}
                      onChange={(e) => setFormStylist(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="Rahul Sharma">Rahul Sharma (Senior Stylist)</option>
                      <option value="Suresh Kumar">Suresh Kumar (Stylist)</option>
                      <option value="Pooja Nair">Pooja Nair (Skin & Facial Specialist)</option>
                    </select>
                  </div>

                  {/* Service */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Service</label>
                    <select
                      value={formService}
                      onChange={(e) => {
                        setFormService(e.target.value);
                        if (e.target.value.includes('Keratin')) setFormPrice(4500);
                        else if (e.target.value.includes('Facial')) setFormPrice(2800);
                        else if (e.target.value.includes('Color')) setFormPrice(5200);
                        else setFormPrice(950);
                      }}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="Haircut & Styling">Haircut & Styling — ₹950</option>
                      <option value="Keratin Smooth Treatment">Keratin Smooth Treatment — ₹4,500</option>
                      <option value="Hydra Glow Facial">Hydra Glow Facial — ₹2,800</option>
                      <option value="Balayage & Color Highlights">Balayage & Color Highlights — ₹5,200</option>
                      <option value="Deep Hair Spa Therapy">Deep Hair Spa Therapy — ₹1,600</option>
                    </select>
                  </div>

                  {/* Time Slot */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Time Slot</label>
                    <input
                      type="text"
                      placeholder="e.g. 11:30 AM"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  {/* Estimated Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Amount (₹)</label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
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
          <span className="text-[10px] text-slate-400 font-medium">Scheduled for today</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Confirmed</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">{stats.confirmed}</div>
          <span className="text-[10px] text-purple-600 font-medium">Ready for service</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Completed</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">{stats.completed}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Invoiced & settled</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Pending</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">{stats.pending}</div>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting confirmation</span>
        </div>
      </div>

      {/* Table & Filters */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client, stylist, or service..."
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
                <th className="pb-3 pl-1">Booking ID</th>
                <th className="pb-3">Client</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Stylist</th>
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
                    <td className="py-3.5 pl-1 font-mono text-[11px] font-bold text-slate-400">
                      {appt.id}
                    </td>
                    <td className="py-3.5">
                      <div className="font-semibold text-slate-900">{appt.customer}</div>
                      <div className="text-[11px] text-slate-400">{appt.phone}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-medium">{appt.service}</span>
                      <span className="block text-[11px] text-slate-400">{appt.duration}</span>
                    </td>
                    <td className="py-3.5 font-medium text-slate-800">{appt.stylist}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                        <Clock className="w-3 h-3 text-purple-600" />
                        {appt.time}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">
                      ₹{appt.price.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        appt.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : appt.status === 'Confirmed'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : appt.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`font-semibold text-[11px] ${appt.payment === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {appt.payment}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {appt.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(appt.id, 'Completed')}
                            className="p-1 text-slate-400 hover:text-emerald-600"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {appt.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(appt.id, 'Cancelled')}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    No appointments found matching your search.
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
