'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Phone, 
  CalendarPlus, 
  IndianRupee, 
  Calendar, 
  Eye,
  Trash2,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useFirestore, useUser, useCollection, addDocumentNonBlocking } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Customer, Appointment } from '@/lib/data';

interface CustomerViewItem {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  visits: number;
  totalSpent: number;
  loyaltyPoints: number;
  lastVisit: string;
}

export default function CustomersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const customersQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);

  const appointmentsQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/appointments`));
  }, [firestore, salonId]);

  const { data: dbCustomers } = useCollection<Customer>(customersQuery);
  const { data: dbAppointments } = useCollection<Appointment>(appointmentsQuery);

  const [localCustomers, setLocalCustomers] = useState<CustomerViewItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');

  const displayCustomers: CustomerViewItem[] = useMemo(() => {
    if (dbCustomers) {
      return dbCustomers.map((cust, idx) => {
        const custAppointments = dbAppointments?.filter(
          (a) => a.customerName?.toLowerCase() === cust.name.toLowerCase() || (a as any).customer?.toLowerCase() === cust.name.toLowerCase()
        ) || [];

        const visits = (cust as any).visits || custAppointments.length;
        const totalSpent = (cust as any).totalSpent || custAppointments.reduce((acc, a) => acc + ((a as any).price || 0), 0);
        const loyaltyPoints = (cust as any).loyaltyPoints || Math.round(totalSpent * 0.1);

        // Generate realistic professional customer ID
        const phoneSuffix = (cust.phone || '').replace(/[^0-9]/g, '').slice(-4);
        const realisticCode = (cust as any).customerCode || `CUST-2026-${phoneSuffix || String(1001 + idx)}`;

        return {
          id: cust.id,
          customerCode: realisticCode,
          name: cust.name,
          phone: cust.phone || '+91 98000 00000',
          email: cust.email || '',
          dob: cust.dob || '',
          visits,
          totalSpent,
          loyaltyPoints,
          lastVisit: (cust as any).lastVisit || (custAppointments.length > 0 ? ((custAppointments[0] as any).time || 'Recent') : 'No visits yet'),
        };
      });
    }
    return localCustomers;
  }, [dbCustomers, dbAppointments, localCustomers]);

  const filteredCustomers = useMemo(() => {
    return displayCustomers.filter((cust) => {
      const matchesSearch =
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.phone.includes(searchQuery) ||
        cust.customerCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [displayCustomers, searchQuery]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const phoneClean = newPhone.replace(/[^0-9]/g, '');
    const phoneSuffix = phoneClean.slice(-4);
    const newCode = `CUST-2026-${phoneSuffix || Math.floor(1000 + Math.random() * 9000)}`;

    const newCust: CustomerViewItem = {
      id: String(Date.now()),
      customerCode: newCode,
      name: newName,
      phone: newPhone || '+91 98000 00000',
      dob: newDob,
      visits: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      lastVisit: 'New Client',
    };

    if (firestore && salonId) {
      const customerRef = collection(firestore, `salons/${salonId}/customers`);
      addDocumentNonBlocking(customerRef, {
        name: newCust.name,
        phone: newCust.phone,
        dob: newCust.dob,
        customerCode: newCode,
        loyaltyPoints: 0,
        totalSpent: 0,
        visits: 0,
        salonId,
        createdAt: new Date().toISOString(),
      });
    }

    setLocalCustomers([newCust, ...localCustomers]);
    setAddDialogOpen(false);
    setIsSubmitting(false);
    setNewName('');
    setNewPhone('');
    setNewDob('');
    toast({
      title: 'Customer Registered',
      description: `${newCust.name} (ID: ${newCode}) added to your client registry.`,
    });
  };

  const handleExportCSV = () => {
    if (displayCustomers.length === 0) {
      toast({ title: 'No Data', description: 'No customers available to export.', variant: 'destructive' });
      return;
    }

    const headers = 'ID,Name,Phone,Visits,Total Spent (INR),Loyalty Points,Last Visit\n';
    const rows = displayCustomers
      .map((c) => `"${c.customerCode}","${c.name}","${c.phone}",${c.visits},${c.totalSpent},${c.loyaltyPoints},"${c.lastVisit}"`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SalonFlow_Customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Export Complete', description: 'Customer directory exported as CSV.' });
  };

  const totalSpentAll = displayCustomers.reduce((acc, c) => acc + c.totalSpent, 0);
  const totalVisitsAll = displayCustomers.reduce((acc, c) => acc + c.visits, 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Client registry, loyalty rewards balance, visit records, and lifetime value tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span>Export CSV</span>
          </button>

          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Add New Customer</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddCustomer} className="space-y-3.5 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-hidden focus:border-purple-600"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    WhatsApp Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-hidden focus:border-purple-600"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Customer...' : 'Save Customer'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Clean Dynamic Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Customers</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{displayCustomers.length}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Recorded in directory</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Client Visits</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">{totalVisitsAll}</div>
          <span className="text-[10px] text-purple-600 font-medium">Completed appointments</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Active Database</span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-0.5">{displayCustomers.length > 0 ? '100%' : '0%'}</div>
          <span className="text-[10px] text-blue-600 font-medium">Live synchronization</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Client Value</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">₹{totalSpentAll.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-400 font-medium">Cumulative billings</span>
        </div>
      </div>

      {/* Main Table / Mobile Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-purple-600"
            />
          </div>
        </div>

        {/* Mobile Interactive Cards (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((cust) => (
              <div key={cust.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs shrink-0">
                      <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                        {getInitials(cust.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{cust.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{cust.customerCode} • {cust.phone}</div>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/appointments?new=true&customer=${encodeURIComponent(cust.name)}`}
                    className="px-2.5 py-1 rounded-lg bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <CalendarPlus className="w-3 h-3" /> Book
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/60 text-xs">
                  <div className="bg-white rounded-lg p-1.5 border border-slate-200/60">
                    <span className="text-[9px] text-slate-400 block font-semibold">Visits</span>
                    <span className="font-bold text-slate-900">{cust.visits}</span>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-200/60">
                    <span className="text-[9px] text-slate-400 block font-semibold">Loyalty</span>
                    <span className="font-bold text-emerald-600">⭐ {cust.loyaltyPoints}</span>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-200/60">
                    <span className="text-[9px] text-slate-400 block font-semibold">Spent</span>
                    <span className="font-bold text-purple-700">₹{cust.totalSpent.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No customers found. Tap &quot;Add Customer&quot; above to register one.
            </div>
          )}
        </div>

        {/* Customer Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Customer</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Total Visits</th>
                <th className="pb-3">Loyalty Balance</th>
                <th className="pb-3">Total Spent</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs">
                          <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                            {getInitials(cust.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900">{cust.name}</div>
                          <div className="text-[10px] text-purple-700 font-mono font-bold">{cust.customerCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-800">{cust.phone}</td>
                    <td className="py-3.5 font-bold text-slate-900">{cust.visits} visits</td>
                    <td className="py-3.5 font-bold text-emerald-600">⭐ {cust.loyaltyPoints} pts</td>
                    <td className="py-3.5 font-bold text-slate-900">₹{cust.totalSpent.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/appointments?new=true&customer=${encodeURIComponent(cust.name)}`}
                          className="px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                          title="Book Appointment"
                        >
                          <CalendarPlus className="w-3 h-3" /> Book
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No customers in database yet. Click &quot;Add Customer&quot; above to register one.
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
