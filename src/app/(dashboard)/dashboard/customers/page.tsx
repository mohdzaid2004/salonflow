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
  UserCheck,
  Pencil
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
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
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
  
  // Dialog States
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerViewItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');

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
    return displayCustomers.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.customerCode.toLowerCase().includes(q)
      );
    });
  }, [displayCustomers, searchQuery]);

  // Telemetry Aggregations
  const totalCustomers = displayCustomers.length;
  const activeMembers = displayCustomers.filter((c) => c.visits > 0).length;
  const totalRevenue = displayCustomers.reduce((acc, c) => acc + c.totalSpent, 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast({ title: 'Validation Error', description: 'Customer name is required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const phoneSuffix = newPhone.replace(/[^0-9]/g, '').slice(-4);
    const newCustomerCode = `CUST-2026-${phoneSuffix || Math.floor(1000 + Math.random() * 9000)}`;

    const newCustomerData = {
      salonId,
      customerCode: newCustomerCode,
      name: newName.trim(),
      phone: newPhone.trim() || '+91 98000 00000',
      dob: newDob || '',
      visits: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
    };

    if (firestore && salonId) {
      addDocumentNonBlocking(collection(firestore, `salons/${salonId}/customers`), newCustomerData);
    } else {
      setLocalCustomers((prev) => [
        {
          id: String(Date.now()),
          ...newCustomerData,
          lastVisit: 'No visits yet',
        },
        ...prev,
      ]);
    }

    toast({
      title: 'Customer Added',
      description: `${newName} has been registered with ID ${newCustomerCode}.`,
    });

    setNewName('');
    setNewPhone('');
    setNewDob('');
    setIsSubmitting(false);
    setAddDialogOpen(false);
  };

  const handleOpenEdit = (cust: CustomerViewItem) => {
    setSelectedCustomer(cust);
    setEditName(cust.name);
    setEditPhone(cust.phone);
    setEditDob(cust.dob || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!editName.trim()) {
      toast({ title: 'Validation Error', description: 'Customer name is required.', variant: 'destructive' });
      return;
    }

    if (firestore && salonId) {
      const custRef = doc(firestore, `salons/${salonId}/customers`, selectedCustomer.id);
      updateDocumentNonBlocking(custRef, {
        name: editName.trim(),
        phone: editPhone.trim(),
        dob: editDob,
        updatedAt: new Date().toISOString(),
      });
    }

    toast({
      title: 'Customer Updated',
      description: `${editName} details saved successfully.`,
    });

    setEditDialogOpen(false);
  };

  const handleOpenDelete = (cust: CustomerViewItem) => {
    setSelectedCustomer(cust);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedCustomer) return;

    if (firestore && salonId) {
      const custRef = doc(firestore, `salons/${salonId}/customers`, selectedCustomer.id);
      deleteDocumentNonBlocking(custRef);
    } else {
      setLocalCustomers((prev) => prev.filter((c) => c.id !== selectedCustomer.id));
    }

    toast({
      title: 'Customer Removed',
      description: `${selectedCustomer.name} has been removed from customer directory.`,
    });

    setDeleteDialogOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Customer Code,Name,Phone,Date of Birth,Visits,Total Spent,Loyalty Points\n'];
    const rows = displayCustomers.map((c) =>
      `"${c.customerCode}","${c.name}","${c.phone}","${c.dob || 'N/A'}",${c.visits},${c.totalSpent},${c.loyaltyPoints}`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SalonFlow_Customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Export Complete', description: 'Customer directory CSV downloaded.' });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
              <Users className="w-3 h-3" /> Directory & Loyalty
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Customers
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="h-9 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[420px] rounded-3xl p-5 bg-white border border-slate-200 text-slate-900 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold text-slate-900">
                  Register New Customer
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddCustomer} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Phone Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registering...' : 'Save & Add Customer'}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 3 Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Registered</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalCustomers}</div>
          <div className="text-[11px] text-slate-400 font-medium">Verified customer accounts</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Repeat Clients</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono">{activeMembers}</div>
          <div className="text-[11px] text-slate-400 font-medium">Visited 1+ times</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Client Spend</span>
            <IndianRupee className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Lifetime sales contribution</div>
        </div>
      </div>

      {/* Customer Registry Content Area */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, or customer code..."
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

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/appointments?new=true&customer=${encodeURIComponent(cust.name)}`}
                      className="px-2.5 py-1 rounded-lg bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <CalendarPlus className="w-3 h-3" /> Book
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cust)}
                      className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-purple-700 transition-colors"
                      title="Edit Customer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(cust)}
                      className="p-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-purple-700 transition-colors"
                          title="Edit Customer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(cust)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No customers found matching &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit Customer Dialog */}
      {selectedCustomer && (
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[420px] rounded-3xl p-5 bg-white border border-slate-200 text-slate-900 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Edit Customer Details
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Customer Code</label>
                <input
                  type="text"
                  disabled
                  value={selectedCustomer.customerCode}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-purple-700 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Customer Alert Dialog */}
      {selectedCustomer && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[400px] rounded-3xl p-5 bg-white border border-slate-200 text-slate-900 space-y-3">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-extrabold text-slate-900">
                Delete Customer Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-900">{selectedCustomer.name}</strong> ({selectedCustomer.customerCode})? This action cannot be undone. Historical invoices will remain intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-2 flex items-center justify-end gap-2">
              <AlertDialogCancel className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Customer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
