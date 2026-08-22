'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Download, 
  IndianRupee, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Printer,
  Smartphone,
  Eye,
  QrCode
} from 'lucide-react';
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
import type { Customer, Service } from '@/lib/data';

interface InvoiceItem {
  id: string;
  invoiceNo: string;
  customer: string;
  phone: string;
  items: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  method: 'UPI' | 'Card' | 'Cash';
  status: 'Paid' | 'Pending';
  date: string;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const invoicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/invoices`));
  }, [firestore, salonId]);

  const customersQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);

  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId]);

  const { data: dbInvoices } = useCollection<any>(invoicesQuery);
  const { data: dbCustomers } = useCollection<Customer>(customersQuery);
  const { data: dbServices } = useCollection<Service>(servicesQuery);

  const [localInvoices, setLocalInvoices] = useState<InvoiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isNewBillOpen, setNewBillOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // POS Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServicePrice, setSelectedServicePrice] = useState(500);
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Card' | 'Cash'>('UPI');

  // Pre-fill from query params if redirected from appointment
  useEffect(() => {
    const cust = searchParams.get('customer');
    const ph = searchParams.get('phone');
    const srv = searchParams.get('service');
    const pr = searchParams.get('price');

    if (cust || srv) {
      if (cust) setClientName(cust);
      if (ph) setClientPhone(ph);
      if (srv) setSelectedServiceName(srv);
      if (pr) setSelectedServicePrice(Number(pr));
      setNewBillOpen(true);
    }
  }, [searchParams]);

  const invoices: InvoiceItem[] = useMemo(() => {
    if (dbInvoices) {
      return dbInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: inv.customer || 'Client',
        phone: inv.phone || '+91 98000 00000',
        items: inv.items || 'Salon Service',
        subtotal: Number(inv.subtotal) || 500,
        tax: Number(inv.tax) || 0,
        discount: Number(inv.discount) || 0,
        total: Number(inv.total) || 500,
        method: inv.method || 'UPI',
        status: inv.status || 'Paid',
        date: inv.date || 'Today',
      }));
    }
    return localInvoices;
  }, [dbInvoices, localInvoices]);

  const subtotal = selectedServicePrice;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxAmount = Math.round(((subtotal - discountAmount) * 18) / 100);
  const totalPayable = subtotal - discountAmount + taxAmount;

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) || inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) || inv.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const newInv: InvoiceItem = {
      id: String(Date.now()),
      invoiceNo: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: clientName,
      phone: clientPhone || '+91 98000 00000',
      items: selectedServiceName || 'Custom Salon Service',
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: totalPayable,
      method: paymentMode,
      status: 'Paid',
      date: 'Just Now',
    };

    if (firestore && salonId) {
      const invoiceRef = collection(firestore, `salons/${salonId}/invoices`);
      addDocumentNonBlocking(invoiceRef, {
        ...newInv,
        salonId,
        createdAt: new Date().toISOString(),
      });
    }

    setLocalInvoices([newInv, ...localInvoices]);
    setNewBillOpen(false);
    setIsSubmitting(false);
    setClientName('');
    setClientPhone('');
    setSelectedServiceName('');
    toast({
      title: 'Invoice Generated & Paid',
      description: `Invoice ${newInv.invoiceNo} for ₹${newInv.total.toLocaleString('en-IN')} via ${newInv.method}.`,
    });
  };

  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.total, 0);
  const pendingAmt = invoices.filter(i => i.status === 'Pending').reduce((acc, i) => acc + i.total, 0);

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Express salon checkout register, GST tax invoices, and transaction records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isNewBillOpen} onOpenChange={setNewBillOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Bill</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">New POS Bill & Checkout</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateBill} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Customer */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="billing-cust-list"
                      placeholder="e.g. Priya Sundaram"
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value);
                        const f = dbCustomers?.find(c => c.name === e.target.value);
                        if (f?.phone) setClientPhone(f.phone);
                      }}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      required
                    />
                    <datalist id="billing-cust-list">
                      {dbCustomers?.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>

                  {/* Phone */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  {/* Service Selection */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Service Item</label>
                    <input
                      type="text"
                      list="billing-srv-list"
                      placeholder="e.g. Haircut & Styling"
                      value={selectedServiceName}
                      onChange={(e) => {
                        setSelectedServiceName(e.target.value);
                        const s = dbServices?.find(sv => sv.name === e.target.value);
                        if (s) setSelectedServicePrice(s.price || 500);
                      }}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                    <datalist id="billing-srv-list">
                      {dbServices?.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>

                  {/* Service Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Price (₹)</label>
                    <input
                      type="number"
                      value={selectedServicePrice}
                      onChange={(e) => setSelectedServicePrice(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  {/* Discount */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Payment Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['UPI', 'Card', 'Cash'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMode(mode)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                            paymentMode === mode
                              ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Calculation Summary Card */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1.5 mt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount ({discountPercent}%):</span>
                      <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span>+₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>Total Amount:</span>
                    <span className="text-purple-700">₹{totalPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating Invoice...' : `Collect ₹${totalPayable.toLocaleString('en-IN')} & Print Bill`}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Gross Collections</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">₹{totalCollected.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Settled revenue</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Invoices</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">{invoices.length}</div>
          <span className="text-[10px] text-purple-600 font-medium">Tax receipts issued</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Pending Amount</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">₹{pendingAmt.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting settlement</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">GST Compliance</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">18% Active</div>
          <span className="text-[10px] text-slate-400 font-medium">Standard Indian HSN/SAC</span>
        </div>
      </div>

      {/* Main Table / Mobile Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice number, client, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Paid', 'Pending'].map((st) => (
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

        {/* Mobile Interactive Cards (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv) => (
              <div key={inv.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{inv.customer}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{inv.invoiceNo} • {inv.date}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {inv.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Service</span>
                    <span className="font-medium text-slate-800 truncate block">{inv.items}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Method</span>
                    <span className="font-medium text-purple-700">{inv.method}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Subtotal + GST</span>
                    <span className="text-slate-600 font-medium">₹{inv.subtotal} + ₹{inv.tax}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Paid</span>
                    <span className="font-bold text-slate-900">₹{inv.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => toast({ title: 'Invoice Receipt', description: `Printed invoice ${inv.invoiceNo}` })}
                    className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-600" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => toast({ title: 'WhatsApp Sent', description: `Invoice sent to ${inv.phone}` })}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No billing records yet. Tap &quot;Create New Bill&quot; to generate an invoice.
            </div>
          )}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Invoice No</th>
                <th className="pb-3">Client</th>
                <th className="pb-3">Services</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Mode</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1 font-mono font-bold text-purple-700">{inv.invoiceNo}</td>
                    <td className="py-3.5">
                      <div className="font-semibold text-slate-900">{inv.customer}</div>
                      <div className="text-[10px] text-slate-400">{inv.phone}</div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-800">{inv.items}</td>
                    <td className="py-3.5 font-bold text-slate-900">₹{inv.total.toLocaleString('en-IN')}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {inv.method}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast({ title: 'Invoice Printed', description: `Invoice ${inv.invoiceNo}` })}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-purple-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast({ title: 'WhatsApp Sent', description: `Invoice sent to ${inv.phone}` })}
                          className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-2xs"
                          title="Send on WhatsApp"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No invoices in database yet. Click &quot;Create New Bill&quot; to issue an invoice.
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
