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
  Scissors, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Clock, 
  IndianRupee, 
  Sparkles, 
  UserCheck,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { collection, query, doc } from 'firebase/firestore';
import type { Service } from '@/lib/data';
import { AddServiceForm, SERVICE_CATEGORIES } from '@/components/dashboard/services/add-service-form';
import { EditServiceForm } from '@/components/dashboard/services/edit-service-form';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_SERVICES = [
  { id: 'SRV-001', name: 'Signature Haircut & Styling', category: 'Hair', duration: '45 mins', price: 950, assignedStaff: 'Rahul, Suresh', status: 'Active' },
  { id: 'SRV-002', name: 'Keratin Smooth & Protein Treatment', category: 'Hair', duration: '90 mins', price: 4500, assignedStaff: 'Rahul Sharma', status: 'Active' },
  { id: 'SRV-003', name: 'Hydra Glow Deep Cleansing Facial', category: 'Facial', duration: '60 mins', price: 2800, assignedStaff: 'Pooja Nair', status: 'Active' },
  { id: 'SRV-004', name: 'Balayage & Color Highlights', category: 'Hair Color', duration: '120 mins', price: 5200, assignedStaff: 'Rahul, Suresh', status: 'Active' },
  { id: 'SRV-005', name: 'Deep Hair Spa & Scalp Therapy', category: 'Spa', duration: '50 mins', price: 1600, assignedStaff: 'All Stylists', status: 'Active' },
  { id: 'SRV-006', name: 'Bridal HD Glam Makeup', category: 'Makeup', duration: '90 mins', price: 6500, assignedStaff: 'Pooja Nair', status: 'Active' },
  { id: 'SRV-007', name: 'Organic Gold Peel Skin Treatment', category: 'Skin Care', duration: '45 mins', price: 2200, assignedStaff: 'Pooja Nair', status: 'Active' },
  { id: 'SRV-008', name: 'Executive Beard Trim & Hot Towel', category: 'Hair', duration: '30 mins', price: 450, assignedStaff: 'Suresh Kumar', status: 'Active' },
];

export default function ServicesPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const salonId = user?.uid;

  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId, isUserLoading]);

  const { data: dbServices } = useCollection<Service>(servicesQuery);

  const servicesList = useMemo(() => {
    if (dbServices && dbServices.length > 0) {
      return dbServices.map(s => ({
        id: s.id,
        name: s.name,
        category: (s as any).category || 'Hair',
        duration: (s as any).duration || '45 mins',
        price: s.price || 500,
        assignedStaff: (s as any).assignedStaff || 'All Stylists',
        status: 'Active',
      }));
    }
    return DEFAULT_SERVICES;
  }, [dbServices]);

  const filteredServices = useMemo(() => {
    return servicesList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || s.category.toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [servicesList, searchQuery, activeCategory]);

  const handleEditClick = (service: any) => {
    setSelectedService(service);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (service: any) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedService || !firestore || !salonId) return;
    const serviceDocRef = doc(firestore, `salons/${salonId}/services`, selectedService.id);
    deleteDocumentNonBlocking(serviceDocRef);
    toast({ title: 'Service Deleted', description: `${selectedService.name} has been removed.` });
    setDeleteDialogOpen(false);
    setSelectedService(null);
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Services Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage your salon services, category menus, pricing, and stylist assignments.
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
                <span>Add Service</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-1">
                <DialogTitle className="text-lg font-bold text-slate-900">Add New Service</DialogTitle>
              </DialogHeader>
              <AddServiceForm setOpen={setAddDialogOpen} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Active Services</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{servicesList.length}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Across {SERVICE_CATEGORIES.length} categories</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Avg Service Price</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">₹2,350</div>
          <span className="text-[10px] text-purple-600 font-medium">Standard catalog rate</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Top Category</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">Hair Care</div>
          <span className="text-[10px] text-slate-400 font-medium">48% of total bookings</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Bookings</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">540+</div>
          <span className="text-[10px] text-emerald-600 font-medium">Delivered this month</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Category Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search services by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', ...SERVICE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Services Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Service</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Assigned Staff</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredServices.length > 0 ? (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div className="font-semibold text-slate-900">{srv.name}</div>
                      <div className="text-[10px] text-slate-400">ID: {srv.id}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        {srv.category}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                        <Clock className="w-3 h-3 text-purple-600" />
                        {srv.duration}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">
                      ₹{srv.price.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">{srv.assignedStaff}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Active
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(srv)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                          title="Edit Service"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(srv)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-2xs"
                          title="Delete Service"
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
                    No services found matching your criteria.
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
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Service</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <EditServiceForm
              key={selectedService.id}
              service={selectedService}
              setOpen={setEditDialogOpen}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-6 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">Delete Service?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              This action will remove <span className="font-bold text-slate-800">{selectedService?.name}</span> from your active catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="h-8 rounded-xl text-xs font-semibold" onClick={() => setSelectedService(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold" onClick={handleDeleteConfirm}>
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
