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
  Award, 
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { collection, query, doc } from 'firebase/firestore';
import type { Staff } from '@/lib/data';
import { AddStaffForm } from '@/components/dashboard/staff/add-staff-form';
import { EditStaffForm } from '@/components/dashboard/staff/edit-staff-form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
      phone: s.phone || '',
      role: s.role || 'Staff Member',
      specialization: (s as any).specialization || 'Salon Services',
      appointmentsToday: 0,
      revenue: 0,
      hours: '10:00 AM - 07:00 PM',
      rating: 5.0,
      reviewCount: 0,
      status: 'Active',
    }));
  }, [dbStaff]);

  const dynamicRoles = useMemo(() => {
    const roles = new Set<string>();
    staffList.forEach(s => {
      if (s.role) roles.add(s.role);
    });
    return ['All', ...Array.from(roles)];
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'All' || s.role.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  const handleDeleteStaff = () => {
    if (!selectedStaff || !salonId || !firestore) return;
    const docRef = doc(firestore, `salons/${salonId}/staff`, selectedStaff.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Staff Member Removed',
      description: `${selectedStaff.name} has been removed from your staff directory.`,
    });
    setDeleteDialogOpen(false);
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
            Staff & Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage your salon team members, roles, contact details, and attendance.
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold text-slate-900">Add Team Member</DialogTitle>
            </DialogHeader>
            <AddStaffForm setOpen={setAddDialogOpen} />
          </DialogContent>
        </Dialog>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Staff</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{staffList.length}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Team members</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Active Roles</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">{Math.max(0, dynamicRoles.length - 1)}</div>
          <span className="text-[10px] text-purple-600 font-medium">Distinct job functions</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Availability</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{staffList.length > 0 ? '100%' : '0%'}</div>
          <span className="text-[10px] text-slate-400 font-medium">Roster sync</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Performance</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">5.0 ★</div>
          <span className="text-[10px] text-emerald-600 font-medium">Rating average</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Role Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          {dynamicRoles.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {dynamicRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    roleFilter.toLowerCase() === role.toLowerCase()
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Team Member</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Specialization</th>
                <th className="pb-3">Working Hours</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs">
                          <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                            {getInitials(staff.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900">{staff.name}</div>
                          <div className="text-[10px] text-slate-400">{staff.phone || `ID: ${staff.id}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">{staff.specialization}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{staff.hours}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setEditDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                          title="Edit Member"
                        >
                          <Pencil className="w-3.5 h-3.5 text-purple-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-2xs"
                          title="Delete Member"
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
                    No staff members in your team yet. Click &quot;Add Staff&quot; to add your stylists and staff.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit Staff Dialog */}
      {selectedStaff && (
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold text-slate-900">Edit Team Member</DialogTitle>
            </DialogHeader>
            <EditStaffForm staff={selectedStaff} setOpen={setEditDialogOpen} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-6 bg-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove &quot;{selectedStaff?.name}&quot; from your salon team?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStaff}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
