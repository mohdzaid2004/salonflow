'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, deleteDocumentNonBlocking } from '@/firebase';
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
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Plus, 
  Search, 
  Star, 
  Pencil, 
  Trash2, 
  Clock, 
  IndianRupee, 
  Crown, 
  Award, 
  UserCheck,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { collection, query, doc } from 'firebase/firestore';
import type { Staff, Review } from '@/lib/data';
import { AddStaffForm } from '@/components/dashboard/staff/add-staff-form';
import { EditStaffForm } from '@/components/dashboard/staff/edit-staff-form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const DEFAULT_STAFF = [
  { id: 'STF-001', name: 'Rahul Sharma', role: 'Senior Stylist', specialization: 'Keratin & Hair Color', appointmentsToday: 6, revenue: 14800, hours: '09:30 AM - 07:00 PM', rating: 4.9, reviewCount: 48, status: 'Active' },
  { id: 'STF-002', name: 'Pooja Nair', role: 'Beautician & Skin Specialist', specialization: 'Hydra Facials & Bridal', appointmentsToday: 5, revenue: 11200, hours: '10:00 AM - 07:30 PM', rating: 4.8, reviewCount: 36, status: 'Active' },
  { id: 'STF-003', name: 'Suresh Kumar', role: 'Hair Stylist', specialization: 'Precision Cuts & Fades', appointmentsToday: 8, revenue: 8400, hours: '09:00 AM - 06:30 PM', rating: 4.7, reviewCount: 29, status: 'Active' },
  { id: 'STF-004', name: 'Anjali Deshmukh', role: 'Receptionist & Billing Lead', specialization: 'Client Concierge', appointmentsToday: 0, revenue: 0, hours: '09:00 AM - 08:00 PM', rating: 5.0, reviewCount: 14, status: 'Active' },
  { id: 'STF-005', name: 'Imran Khan', role: 'Senior Stylist', specialization: 'Hair Botox & Highlights', appointmentsToday: 4, revenue: 9800, hours: '11:00 AM - 08:30 PM', rating: 4.8, reviewCount: 22, status: 'Active' },
];

export default function StaffPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  const salonId = user?.uid;

  const staffQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId, isUserLoading]);

  const { data: dbStaff } = useCollection<Staff>(staffQuery);

  const staffList = useMemo(() => {
    if (!dbStaff) return [];
    return dbStaff.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role || 'Stylist',
      specialization: (s as any).specialization || 'Hair & Grooming',
      appointmentsToday: 0,
      revenue: 0,
      hours: '10:00 AM - 07:00 PM',
      rating: 5.0,
      reviewCount: 0,
      status: 'Active',
    }));
  }, [dbStaff]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'All' || s.role.toLowerCase().includes(roleFilter.toLowerCase());
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  const handleEditClick = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedStaff || !firestore || !salonId) return;
    const staffDocRef = doc(firestore, `salons/${salonId}/staff`, selectedStaff.id);
    deleteDocumentNonBlocking(staffDocRef);
    toast({ title: 'Staff Removed', description: `${selectedStaff.name} has been removed.` });
    setDeleteDialogOpen(false);
    setSelectedStaff(null);
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
            Staff Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage your team of stylists, beauticians, daily schedules, and revenue performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-1">
                <DialogTitle className="text-lg font-bold text-slate-900">Add a New Staff Member</DialogTitle>
              </DialogHeader>
              <AddStaffForm setOpen={setAddDialogOpen} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Staff</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{staffList.length}</div>
          <span className="text-[10px] text-emerald-600 font-medium">All positions active</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Stylists On Duty</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">4</div>
          <span className="text-[10px] text-purple-600 font-medium">23 total slots booked</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Avg Stylist Rating</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">4.85 ★</div>
          <span className="text-[10px] text-amber-600 font-medium">Based on 140+ reviews</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Team Daily Revenue</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">₹44,200</div>
          <span className="text-[10px] text-slate-400 font-medium">Earned today</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Role Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Senior Stylist', 'Hair Stylist', 'Beautician', 'Receptionist'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  roleFilter === role
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Staff Member</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Specialization</th>
                <th className="pb-3">Today&apos;s Bookings</th>
                <th className="pb-3">Revenue (Today)</th>
                <th className="pb-3">Shift Hours</th>
                <th className="pb-3">Rating</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((stf) => (
                  <tr key={stf.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs">
                          <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                            {getInitials(stf.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900">{stf.name}</div>
                          <div className="text-[10px] text-slate-400">ID: {stf.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        {stf.role}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">{stf.specialization}</td>
                    <td className="py-3.5 font-bold text-slate-900">{stf.appointmentsToday} bookings</td>
                    <td className="py-3.5 font-bold text-slate-900">₹{stf.revenue.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 text-slate-500 font-medium">{stf.hours}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{stf.rating}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({stf.reviewCount})</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(stf)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                          title="Edit Staff"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(stf)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-2xs"
                          title="Remove Staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No staff members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[480px] max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Staff Member</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <EditStaffForm
              key={selectedStaff.id}
              staff={selectedStaff}
              setOpen={setEditDialogOpen}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-6 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              This action will remove <span className="font-bold text-slate-800">{selectedStaff?.name}</span> and their login permissions from your salon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="h-8 rounded-xl text-xs font-semibold" onClick={() => setSelectedStaff(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold" onClick={handleDeleteConfirm}>
              Confirm Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
