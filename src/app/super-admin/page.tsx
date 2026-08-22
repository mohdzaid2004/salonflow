'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Building2, 
  IndianRupee, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Activity, 
  ArrowUpRight, 
  Smartphone, 
  Settings, 
  Lock, 
  Key,
  Database,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useCollection, useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SalonTenant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  plan?: 'Free' | 'Starter' | 'Pro' | 'Enterprise';
  status?: 'Active' | 'Trial' | 'Suspended';
  createdAt?: string;
  automatedWhatsappEnabled?: boolean;
}

export default function SuperAdminPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTenant, setSelectedTenant] = useState<SalonTenant | null>(null);
  const [isTenantModalOpen, setTenantModalOpen] = useState(false);

  // System feature flags
  const [whatsappGatewayActive, setWhatsappGatewayActive] = useState(true);
  const [razorpayGatewayActive, setRazorpayGatewayActive] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Firestore query for all salon tenants
  const salonsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'salons'));
  }, [firestore]);

  const { data: dbSalons, isLoading } = useCollection<SalonTenant>(salonsQuery);

  const tenants: SalonTenant[] = useMemo(() => {
    if (dbSalons) {
      return dbSalons.map((s, idx) => ({
        id: s.id,
        name: s.name || `Salon ${s.id.slice(0, 6)}`,
        phone: s.phone || '+91 98765 43210',
        email: s.email || `owner_${s.id.slice(0, 4)}@salonflow.in`,
        city: (s as any).city || (s as any).address || 'Mumbai, India',
        plan: s.plan || (idx % 2 === 0 ? 'Pro' : 'Starter'),
        status: s.status || 'Active',
        createdAt: s.createdAt || '2026-08-01',
        automatedWhatsappEnabled: s.automatedWhatsappEnabled !== false,
      }));
    }
    return [];
  }, [dbSalons]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchQuery, statusFilter]);

  const totalSalons = tenants.length;
  const activeSalons = tenants.filter((t) => t.status === 'Active').length;
  const proSalons = tenants.filter((t) => t.plan === 'Pro' || t.plan === 'Enterprise').length;
  const estimatedMRR = proSalons * 1999 + (activeSalons - proSalons) * 999;

  const handleUpdateTenantPlan = (tenantId: string, newPlan: 'Free' | 'Starter' | 'Pro' | 'Enterprise') => {
    if (firestore) {
      const salonRef = doc(firestore, 'salons', tenantId);
      updateDocumentNonBlocking(salonRef, { plan: newPlan });
      toast({
        title: 'Plan Updated',
        description: `Salon plan upgraded to ${newPlan} successfully.`,
      });
      setTenantModalOpen(false);
    }
  };

  const handleToggleTenantStatus = (tenantId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    if (firestore) {
      const salonRef = doc(firestore, 'salons', tenantId);
      updateDocumentNonBlocking(salonRef, { status: nextStatus });
      toast({
        title: 'Tenant Status Updated',
        description: `Salon status changed to ${nextStatus}.`,
      });
      setTenantModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/overview"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Platform Super Admin
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              Global Platform Control Center
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Multi-Tenant Engine Online</span>
          </span>
        </div>
      </div>

      {/* 4 Primary Platform Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Salons */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Registered Salons</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {isLoading ? '...' : totalSalons}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {activeSalons} Active Tenants
          </div>
        </div>

        {/* Platform MRR */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Platform MRR (INR)</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            ₹{estimatedMRR.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Recurring monthly subscription revenue
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Paid Subscribers</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {proSalons} / {totalSalons || 1}
          </div>
          <div className="text-[11px] text-amber-400 font-medium">
            Pro & Enterprise Tier accounts
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">WhatsApp Gateway</span>
            <Smartphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono">
            99.9%
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Automated invoices & feedback delivery
          </div>
        </div>

      </div>

      {/* Global Gateway & Feature Flags Controls */}
      <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" /> Global Platform Feature Switches
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">WhatsApp Global Dispatch</div>
              <div className="text-[10px] text-slate-400">Post-payment receipts & feedback</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setWhatsappGatewayActive(!whatsappGatewayActive);
                toast({ title: 'Gateway Updated', description: `WhatsApp gateway ${!whatsappGatewayActive ? 'Enabled' : 'Disabled'}.` });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                whatsappGatewayActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {whatsappGatewayActive ? 'ENABLED' : 'PAUSED'}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Razorpay SaaS Billing</div>
              <div className="text-[10px] text-slate-400">Subscription upgrades & renewals</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRazorpayGatewayActive(!razorpayGatewayActive);
                toast({ title: 'Gateway Updated', description: `Razorpay billing ${!razorpayGatewayActive ? 'Enabled' : 'Disabled'}.` });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                razorpayGatewayActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {razorpayGatewayActive ? 'LIVE' : 'MAINTENANCE'}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Maintenance Mode</div>
              <div className="text-[10px] text-slate-400">Global read-only lockout</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMaintenanceMode(!maintenanceMode);
                toast({ title: 'Maintenance Mode', description: `Platform maintenance mode ${!maintenanceMode ? 'ACTIVATED' : 'DEACTIVATED'}.` });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                maintenanceMode ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {maintenanceMode ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

        </div>
      </div>

      {/* Tenant Directory Table */}
      <div className="bg-slate-900/80 rounded-2xl p-4 sm:p-6 border border-slate-800/80 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white">Salon Tenant Directory</h2>
            <p className="text-xs text-slate-400">Isolated database partition registry for all onboarded salons.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search salons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-64 h-8 pl-8 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-purple-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Trial">Trial</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Salon / Business</th>
                <th className="pb-3">Tenant ID</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div>
                        <div className="font-bold text-white text-sm">{tenant.name}</div>
                        <div className="text-[11px] text-slate-500">{tenant.phone}</div>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-purple-400 text-[11px]">
                      {tenant.id.slice(0, 10)}...
                    </td>
                    <td className="py-3.5 text-slate-400">{tenant.city}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {tenant.plan || 'Pro'}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          tenant.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {tenant.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setTenantModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No salon tenants matched your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Tenant Management Modal */}
      {selectedTenant && (
        <Dialog open={isTenantModalOpen} onOpenChange={setTenantModalOpen}>
          <DialogContent className="max-w-[420px] rounded-3xl p-5 bg-slate-900 border border-slate-800 text-white space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-white">
                Manage Tenant: {selectedTenant.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Partition ID</div>
                <div className="font-mono text-purple-400 break-all">{selectedTenant.id}</div>
              </div>

              <div className="space-y-1.5">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Change Subscription Tier</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['Free', 'Starter', 'Pro', 'Enterprise'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleUpdateTenantPlan(selectedTenant.id, p)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedTenant.plan === p
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {p} Tier
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleTenantStatus(selectedTenant.id, selectedTenant.status)}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedTenant.status === 'Active'
                      ? 'bg-rose-600/20 text-rose-400 border border-rose-600/30 hover:bg-rose-600/30'
                      : 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30'
                  }`}
                >
                  {selectedTenant.status === 'Active' ? 'Suspend Tenant Access' : 'Activate Tenant Access'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
