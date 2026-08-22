'use client';

import { useState, useMemo } from 'react';
import { 
  IndianRupee, 
  CreditCard, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Share2, 
  QrCode, 
  FileText, 
  User, 
  Scissors, 
  Package, 
  Percent, 
  Smartphone,
  Check
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
  status: 'Paid' | 'Pending' | 'Refunded';
  date: string;
}

const INITIAL_INVOICES: InvoiceItem[] = [
  { id: '1', invoiceNo: 'INV-2026-0841', customer: 'Ananya Verma', phone: '+91 98234 11209', items: 'Keratin Smooth Treatment, Hair Serum', subtotal: 5100, tax: 918, discount: 500, total: 5518, method: 'UPI', status: 'Paid', date: 'Today, 11:45 AM' },
  { id: '2', invoiceNo: 'INV-2026-0840', customer: 'Vikram Mehta', phone: '+91 98450 77123', items: 'Executive Haircut & Beard Grooming', subtotal: 950, tax: 171, discount: 0, total: 1121, method: 'Card', status: 'Paid', date: 'Today, 11:15 AM' },
  { id: '3', invoiceNo: 'INV-2026-0839', customer: 'Priya Sundaram', phone: '+91 97112 44901', items: 'Hydra Glow Facial, Brightening Cream', subtotal: 3900, tax: 702, discount: 300, total: 4302, method: 'UPI', status: 'Paid', date: 'Today, 10:30 AM' },
  { id: '4', invoiceNo: 'INV-2026-0838', customer: 'Rohan Gupta', phone: '+91 99018 33219', items: 'Deep Hair Spa & Scalp Therapy', subtotal: 1600, tax: 288, discount: 0, total: 1888, method: 'Cash', status: 'Pending', date: 'Yesterday, 06:40 PM' },
  { id: '5', invoiceNo: 'INV-2026-0837', customer: 'Kavita Patel', phone: '+91 98765 43210', items: 'Balayage & Color Highlights', subtotal: 5200, tax: 936, discount: 520, total: 5616, method: 'Card', status: 'Paid', date: 'Yesterday, 04:20 PM' },
  { id: '6', invoiceNo: 'INV-2026-0836', customer: 'Deepak Chopra', phone: '+91 98112 33445', items: 'Classic Beard Trim & Wash', subtotal: 450, tax: 81, discount: 0, total: 531, method: 'Cash', status: 'Refunded', date: '18 Aug 2026' },
];

export default function BillingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const invoicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/invoices`));
  }, [firestore, salonId]);

  const { data: dbInvoices } = useCollection<any>(invoicesQuery);

  const [localInvoices, setLocalInvoices] = useState<InvoiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isNewBillOpen, setNewBillOpen] = useState(false);

  // POS Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServicePrice, setSelectedServicePrice] = useState(950);
  const [selectedServiceName, setSelectedServiceName] = useState('Haircut & Styling');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Card' | 'Cash'>('UPI');

  const invoices = useMemo(() => {
    if (dbInvoices) {
      return dbInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: inv.customer || 'Client',
        phone: inv.phone || '+91 98000 00000',
        items: inv.items || 'Salon Service',
        subtotal: inv.subtotal || 1000,
        tax: inv.tax || 180,
        discount: inv.discount || 0,
        total: inv.total || 1180,
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

    const newInv: InvoiceItem = {
      id: String(Date.now()),
      invoiceNo: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: clientName,
      phone: clientPhone || '+91 98000 00000',
      items: selectedServiceName,
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
    setClientName('');
    setClientPhone('');
    toast({
      title: 'Invoice Generated & Saved',
      description: `Invoice ${newInv.invoiceNo} for ₹${newInv.total.toLocaleString('en-IN')} paid via ${newInv.method}.`,
    });
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Billing & POS
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Express salon checkout register, tax invoices, UPI collections, and transaction history.
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
            <DialogContent className="max-w-[500px] max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
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
                      placeholder="e.g. Priya Sharma"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Service Item</label>
                    <select
                      value={selectedServiceName}
                      onChange={(e) => {
                        setSelectedServiceName(e.target.value);
                        if (e.target.value.includes('Keratin')) setSelectedServicePrice(4500);
                        else if (e.target.value.includes('Facial')) setSelectedServicePrice(2800);
                        else if (e.target.value.includes('Balayage')) setSelectedServicePrice(5200);
                        else if (e.target.value.includes('Spa')) setSelectedServicePrice(1600);
                        else setSelectedServicePrice(950);
                      }}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="Haircut & Styling">Haircut & Styling — ₹950</option>
                      <option value="Keratin Smooth Treatment">Keratin Smooth — ₹4,500</option>
                      <option value="Hydra Glow Facial">Hydra Glow Facial — ₹2,800</option>
                      <option value="Balayage & Color Highlights">Balayage Color — ₹5,200</option>
                      <option value="Deep Hair Spa Therapy">Deep Hair Spa — ₹1,600</option>
                    </select>
                  </div>

                  {/* Discount % */}
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Card">Card (POS Terminal)</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                </div>

                {/* Calculation Summary Box */}
                <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs space-y-1.5 mt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%)</span>
                    <span>+₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-purple-200/80">
                    <span>Total Amount</span>
                    <span className="text-purple-700">₹{totalPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-3"
                >
                  Confirm & Settle Bill (₹{totalPayable.toLocaleString('en-IN')})
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Today&apos;s Invoices</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">₹14,240</div>
          <span className="text-[10px] text-emerald-600 font-medium">{invoices.length} bills recorded</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">UPI Payments</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">68%</div>
          <span className="text-[10px] text-purple-600 font-medium">Preferred payment mode</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Pending Amount</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">₹1,888</div>
          <span className="text-[10px] text-amber-600 font-medium">1 customer pending</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">GST Collected</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">₹2,563</div>
          <span className="text-[10px] text-slate-400 font-medium">18% output GST</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Paid', 'Pending', 'Refunded'].map((st) => (
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

        {/* Invoice Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Invoice #</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Items / Services</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Payment Mode</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1 font-mono text-[11px] font-bold text-slate-900">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3.5">
                      <div className="font-semibold text-slate-900">{inv.customer}</div>
                      <div className="text-[10px] text-slate-400">{inv.phone}</div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-800 max-w-[200px] truncate">
                      {inv.items}
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">
                      ₹{inv.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {inv.method}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 font-medium">{inv.date}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : inv.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast({ title: 'Invoice Printed', description: `Printing ${inv.invoiceNo}...` })}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast({ title: 'WhatsApp Sent', description: `Invoice sent to ${inv.phone}` })}
                          className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-2xs"
                          title="Send on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No invoices found matching your criteria.
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
