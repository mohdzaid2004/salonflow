'use client';

import { useState, useMemo } from 'react';
import { 
  Scissors, 
  Search, 
  Plus, 
  Clock, 
  IndianRupee, 
  Pencil, 
  Trash2, 
  Tag, 
  UserCheck, 
  CalendarPlus 
} from 'lucide-react';
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
import { AddServiceForm } from '@/components/dashboard/services/add-service-form';
import { EditServiceForm } from '@/components/dashboard/services/edit-service-form';
import { useFirestore, useUser, useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
interface ServiceViewItem {
  id: string;
  name: string;
  category: string;
  duration: string;
  price: number;
  assignedStaff: string;
  description?: string;
}

export default function ServicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);

  const { data: dbServices } = useCollection<any>(servicesQuery);

  const [localServices, setLocalServices] = useState<ServiceViewItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceViewItem | null>(null);

  const displayServices: ServiceViewItem[] = useMemo(() => {
    if (dbServices) {
      return dbServices.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category || 'General',
        duration: s.duration || '30 min',
        price: Number(s.price) || 500,
        assignedStaff: s.assignedStaff || s.staff || 'All Stylists',
        description: s.description || '',
      }));
    }
    return localServices;
  }, [dbServices, localServices]);

  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    displayServices.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [displayServices]);

  const filteredServices = useMemo(() => {
    return displayServices.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === 'All' || service.category.toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [displayServices, searchQuery, activeCategory]);

  const handleDeleteService = () => {
    if (!selectedService) return;

    if (firestore && salonId) {
      const serviceDocRef = doc(firestore, `salons/${salonId}/services`, selectedService.id);
      deleteDocumentNonBlocking(serviceDocRef);
    }

    setLocalServices(localServices.filter((s) => s.id !== selectedService.id));
    setDeleteDialogOpen(false);
    toast({
      title: 'Service Removed',
      description: `${selectedService.name} has been removed from catalog.`,
    });
  };

  const avgPrice = displayServices.length > 0
    ? Math.round(displayServices.reduce((acc, s) => acc + s.price, 0) / displayServices.length)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Services
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Service catalog, pricing rules, treatment durations, and stylist assignments.
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
                <span>Add Service</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Add New Service</DialogTitle>
              </DialogHeader>
              <AddServiceForm setOpen={setAddDialogOpen} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Services</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{displayServices.length}</div>
          <span className="text-[10px] text-emerald-600 font-medium">In active menu</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Categories</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">{dynamicCategories.length > 1 ? dynamicCategories.length - 1 : 0}</div>
          <span className="text-[10px] text-purple-600 font-medium">Service segments</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Average Price</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">₹{avgPrice.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-400 font-medium">Across active menu</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Online Booking</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">Ready</div>
          <span className="text-[10px] text-emerald-600 font-medium">Synced with appointment desk</span>
        </div>
      </div>

      {/* Main Table / Mobile Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search service name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          {dynamicCategories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {dynamicCategories.map((cat) => (
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
          )}
        </div>

        {/* Mobile Interactive Cards (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <div key={service.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{service.name}</div>
                    <div className="text-[10px] text-slate-400">ID: {service.id}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                    <Tag className="w-2.5 h-2.5 text-purple-600" />
                    {service.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Duration</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {service.duration}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Price</span>
                    <span className="font-bold text-slate-900">₹{service.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block font-semibold">Stylists</span>
                    <span className="font-medium text-slate-600 text-xs">{service.assignedStaff}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(service);
                      setEditDialogOpen(true);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5 text-purple-600" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(service);
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
              No services found. Tap &quot;Add Service&quot; above to create one.
            </div>
          )}
        </div>

        {/* Services Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Service Name</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Assigned Stylists</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div className="font-semibold text-slate-900">{service.name}</div>
                      <div className="text-[10px] text-slate-400">ID: {service.id}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        <Tag className="w-2.5 h-2.5 text-purple-600" />
                        {service.category}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{service.duration}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">₹{service.price.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 font-medium text-slate-600">{service.assignedStaff}</td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            setEditDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                          title="Edit Service"
                        >
                          <Pencil className="w-3.5 h-3.5 text-purple-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-2xs"
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
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No services in database yet. Click &quot;Add Service&quot; above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit Service Dialog */}
      {selectedService && (
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold text-slate-900">Edit Service</DialogTitle>
            </DialogHeader>
            <EditServiceForm service={selectedService as any} setOpen={setEditDialogOpen} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">Delete Service?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete &apos;{selectedService?.name}&apos;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3">
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Delete Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
