'use client';

import { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Phone, 
  Pencil, 
  Trash2, 
  Briefcase, 
  Calendar, 
  IdCard,
  Eye
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
import { AddStaffForm } from '@/components/dashboard/staff/add-staff-form';
import { EditStaffForm } from '@/components/dashboard/staff/edit-staff-form';
import { useFirestore, useUser, useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Staff, Appointment } from '@/lib/data';

export default function StaffPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const staffQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);

  const appointmentsQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/appointments`));
  }, [firestore, salonId]);

  const { data: dbStaff } = useCollection<Staff>(staffQuery);
  const { data: dbAppointments } = useCollection<Appointment>(appointmentsQuery);

  const [localStaff, setLocalStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState('All');

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const displayStaff = useMemo(() => {
    if (dbStaff) {
      return dbStaff.map((st: any) => ({
        id: st.id,
        name: st.name,
        role: st.role || 'Stylist',
        phone: st.phone || '+91 98000 00000',
        aadharNumber: st.aadharNumber || '',
        address: st.address || '',
        dob: st.dob || '',
        status: st.status || 'Active',
      }));
    }
    return localStaff;
  }, [dbStaff, localStaff]);

  const dynamicRoles = useMemo(() => {
    const roles = new Set<string>();
    roles.add('All');
    displayStaff.forEach(s => {
      if (s.role) roles.add(s.role);
    });
    return Array.from(roles);
  }, [displayStaff]);

  const filteredStaff = useMemo(() => {
    return displayStaff.filter((st) => {
      const matchesSearch =
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.phone && st.phone.includes(searchQuery));
      const matchesRole =
        activeRole === 'All' || st.role.toLowerCase() === activeRole.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [displayStaff, searchQuery, activeRole]);

  const handleDeleteStaff = () => {
    if (!selectedStaff) return;

    if (firestore && salonId) {
      const staffDocRef = doc(firestore, `salons/${salonId}/staff`, selectedStaff.id);
      deleteDocumentNonBlocking(staffDocRef);
    }

    setLocalStaff(localStaff.filter((s) => s.id !== selectedStaff.id));
    setDeleteDialogOpen(false);
    toast({
      title: 'Team Member Removed',
      description: `${selectedStaff.name} has been removed.`,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Staff
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Team roster, hair stylists, beauticians, commissions, and staff assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Team Member</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Add Team Member</DialogTitle>
              </DialogHeader>
              <AddStaffForm setOpen={setAddDialogOpen} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Staff</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{displayStaff.length}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Active roster</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Roles / Disciplines</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">{dynamicRoles.length > 1 ? dynamicRoles.length - 1 : 0}</div>
          <span className="text-[10px] text-purple-600 font-medium">Distinct specializations</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Chair Allocation</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{displayStaff.length > 0 ? '100%' : '0%'}</div>
          <span className="text-[10px] text-slate-400 font-medium">Available for booking</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Commission System</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">Active</div>
          <span className="text-[10px] text-emerald-600 font-medium">Auto-tracked per bill</span>
        </div>
      </div>

      {/* Main Table / Mobile Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Role Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, role, or phone..."
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
                  onClick={() => setActiveRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeRole.toLowerCase() === role.toLowerCase()
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

        {/* Mobile Interactive Cards (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <div key={staff.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs shrink-0">
                      <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                        {getInitials(staff.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{staff.name}</div>
                      <div className="text-[11px] text-purple-700 font-semibold">{staff.role}</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Phone</span>
                    <span className="font-medium text-slate-800">{staff.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Aadhar</span>
                    <span className="font-mono text-slate-600 text-[11px]">{staff.aadharNumber || 'Not Provided'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setEditDialogOpen(true);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5 text-purple-600" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setDeleteDialogOpen(true);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No staff members found. Tap &quot;Add Team Member&quot; above to register one.
            </div>
          )}
        </div>

        {/* Staff Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Team Member</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Aadhar</th>
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
                          <div className="text-[10px] text-slate-400">ID: {staff.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        <Briefcase className="w-2.5 h-2.5 text-purple-600" />
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 font-medium text-slate-800">{staff.phone}</td>
                    <td className="py-3.5 font-mono text-slate-500">{staff.aadharNumber || '—'}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
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
                          title="Edit Details"
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
                    No team members in database yet. Click &quot;Add Team Member&quot; above to create one.
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
          <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold text-slate-900">Edit Team Member</DialogTitle>
            </DialogHeader>
            <EditStaffForm staff={selectedStaff} setOpen={setEditDialogOpen} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">Delete Team Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove &apos;{selectedStaff?.name}&apos; from your team roster?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3">
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Delete Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
