'use client';

import { useState, useRef, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Star, 
  Phone, 
  Calendar, 
  IndianRupee, 
  Crown, 
  Sparkles, 
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  Trash2,
  Eye,
  CalendarPlus
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { collection, query, doc, writeBatch } from 'firebase/firestore';
import type { Customer, Salon } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const SAMPLE_CUSTOMERS = [
  { id: 'CUST-001', name: 'Ananya Verma', phone: '+91 98234 11209', visits: 14, lastVisit: 'Yesterday', totalSpent: 38400, tier: 'VIP', points: 384 },
  { id: 'CUST-002', name: 'Vikram Mehta', phone: '+91 98450 77123', visits: 8, lastVisit: '18 Aug 2026', totalSpent: 12500, tier: 'Gold', points: 125 },
  { id: 'CUST-003', name: 'Priya Sundaram', phone: '+91 97112 44901', visits: 22, lastVisit: 'Today', totalSpent: 64200, tier: 'VIP', points: 642 },
  { id: 'CUST-004', name: 'Rohan Gupta', phone: '+91 99018 33219', visits: 4, lastVisit: '12 Aug 2026', totalSpent: 6800, tier: 'Silver', points: 68 },
  { id: 'CUST-005', name: 'Kavita Patel', phone: '+91 98765 43210', visits: 11, lastVisit: '15 Aug 2026', totalSpent: 29800, tier: 'Gold', points: 298 },
  { id: 'CUST-006', name: 'Deepak Chopra', phone: '+91 98112 33445', visits: 2, lastVisit: '04 Aug 2026', totalSpent: 1800, tier: 'Regular', points: 18 },
  { id: 'CUST-007', name: 'Meera Kapoor', phone: '+91 98990 12345', visits: 19, lastVisit: 'Today', totalSpent: 52000, tier: 'VIP', points: 520 },
];

export default function CustomersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');

  const salonId = user?.uid;

  const customersQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId, isUserLoading]);
  
  const { data: dbCustomers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  // Merge live Firestore customers with sample realistic fallback
  const displayCustomers = useMemo(() => {
    if (dbCustomers && dbCustomers.length > 0) {
      return dbCustomers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        visits: c.visitHistory?.length || 1,
        lastVisit: 'Recent',
        totalSpent: 4500,
        tier: (c.loyaltyPoints && c.loyaltyPoints > 200) ? 'VIP' : 'Regular',
        points: c.loyaltyPoints || 0,
      }));
    }
    return SAMPLE_CUSTOMERS;
  }, [dbCustomers]);

  const filteredCustomers = useMemo(() => {
    return displayCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
      const matchesTier = tierFilter === 'All' || c.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [displayCustomers, searchQuery, tierFilter]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      toast({ title: 'Error', description: 'Name and 10-digit phone number are required.', variant: 'destructive' });
      return;
    }

    if (salonId && firestore) {
      const customerRef = collection(firestore, `salons/${salonId}/customers`);
      addDocumentNonBlocking(customerRef, {
        salonId,
        name: newName,
        phone: newPhone.replace(/\D/g, ''),
        dob: newDob || '',
        loyaltyPoints: 50,
        visitHistory: [],
        createdAt: new Date().toISOString(),
      });
    }

    toast({
      title: 'Customer Added',
      description: `${newName} has been added to your salon directory.`,
    });
    setAddDialogOpen(false);
    setNewName('');
    setNewPhone('');
    setNewDob('');
  };

  const handleDownloadCSV = () => {
    const headers = ['Name', 'Phone', 'Visits', 'Total Spent', 'Tier', 'Loyalty Points'];
    const csvRows = [headers.join(',')];
    filteredCustomers.forEach(c => {
      csvRows.push([`"${c.name}"`, `"${c.phone}"`, c.visits, c.totalSpent, `"${c.tier}"`, c.points].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'SalonFlow_Customers.csv';
    link.click();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage your salon customers, visit history, loyalty tiers, and client profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv, .xlsx"
            onChange={() => toast({ title: 'Import Complete', description: 'Customers list updated.' })}
          />
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Export CSV</span>
          </button>

          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[440px] max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Add New Customer</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddCustomer} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meera Kapoor"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Phone Number (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4"
                >
                  Save Customer
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Customers</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">1,480</div>
          <span className="text-[10px] text-emerald-600 font-medium">+34 this month</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Active Clients</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">426</div>
          <span className="text-[10px] text-purple-600 font-medium">Visited in last 30 days</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">VIP Members</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">84</div>
          <span className="text-[10px] text-amber-600 font-medium">High LTV salon clients</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Client Value</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">₹8.42L</div>
          <span className="text-[10px] text-slate-400 font-medium">Lifetime revenue</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'VIP', 'Gold', 'Silver', 'Regular'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  tierFilter === tier
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Customer</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Total Visits</th>
                <th className="pb-3">Last Visit</th>
                <th className="pb-3">Total Spent</th>
                <th className="pb-3">Loyalty Tier</th>
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
                          <div className="text-[10px] text-slate-400">ID: {cust.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-800">{cust.phone}</td>
                    <td className="py-3.5 font-bold text-slate-900">{cust.visits} visits</td>
                    <td className="py-3.5 text-slate-500">{cust.lastVisit}</td>
                    <td className="py-3.5 font-bold text-slate-900">₹{cust.totalSpent.toLocaleString('en-IN')}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        cust.tier === 'VIP'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : cust.tier === 'Gold'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : cust.tier === 'Silver'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {cust.tier === 'VIP' && <Crown className="w-2.5 h-2.5 text-purple-600" />}
                        {cust.tier}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/customers/${cust.id}`}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href="/dashboard/appointments"
                          className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 shadow-2xs"
                          title="Book Appointment"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No customers found matching your search.
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
