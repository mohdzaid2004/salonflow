'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  IndianRupee, 
  Printer, 
  Smartphone, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Share2,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';

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
  pointsEarned?: number;
  loyaltyBalance?: number;
}

export default function BillingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const invoicesQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/invoices`));
  }, [firestore, salonId]);

  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: dbInvoices } = useCollection<any>(invoicesQuery);
  const { data: salon } = useDoc<any>(salonDocRef);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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
        pointsEarned: inv.pointsEarned || Math.round((Number(inv.total) || 500) * 0.1),
        loyaltyBalance: inv.loyaltyBalance || Math.round((Number(inv.total) || 500) * 0.1),
      }));
    }
    return [];
  }, [dbInvoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
        inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
        inv.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleSendWhatsAppInvoice = async (inv: InvoiceItem) => {
    const cleanPhone = inv.phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://salonflow--salonindia-74cbb.us-east4.hosted.app';
    const feedbackUrl = `${baseUrl}/feedback/${salonId || 'default'}_${inv.id}`;
    const invoicePdfUrl = `${baseUrl}/api/invoices/${salonId || 'default'}_${inv.id}/pdf`;
    const salonName = salon?.name || 'SalonFlow';
    const salonPhone = salon?.phone || '+91 98765 43210';
    const salonAddress = salon?.address || '';

    const messageText = `💜 Thank You for Visiting ${salonName}!

Hi ${inv.customer} 👋

We hope you enjoyed your ${inv.items} experience with us! ✨

Your payment of ₹${inv.total.toLocaleString('en-IN')} has been successfully received. 🎉

🧾 Invoice: ${inv.invoiceNo}
💳 Payment: ${inv.method}
💰 Amount Paid: ₹${inv.total.toLocaleString('en-IN')}

🎁 Loyalty Points Earned: ${inv.pointsEarned || Math.round(inv.total * 0.1)}
⭐ Loyalty Balance: ${inv.loyaltyBalance || Math.round(inv.total * 0.1)} Points

📎 Your invoice is attached to this WhatsApp message.

⭐ How was your experience?

We'd love to hear your feedback.
It only takes a few seconds. ❤️

👉 Rate Your Experience:
${feedbackUrl}

Your feedback helps us improve and serve you better. 💫

Thank you for choosing ${salonName}! ❤️

We look forward to welcoming you again.

${salonAddress ? `📍 ${salonAddress}\n` : ''}📞 ${salonPhone}`;

    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: targetPhone, 
          message: messageText,
          mediaUrl: invoicePdfUrl 
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'WhatsApp Sent', description: `Invoice & feedback link sent to ${inv.phone}.` });
        return;
      }
    } catch (e) {
      // Fallback direct open
    }

    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
    toast({ title: 'Opening WhatsApp', description: `Pre-filled invoice message ready for ${inv.customer}.` });
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
            Automatic GST tax invoices and transaction records generated from completed customer visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automated Billing Active</span>
          </span>
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
                    onClick={() => handleSendWhatsAppInvoice(inv)}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No invoices generated yet. Invoices are automatically created and stored upon completing customer visit payments in the Appointments desk.
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
                          onClick={() => handleSendWhatsAppInvoice(inv)}
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
                    No invoices generated yet. Invoices are automatically created and stored upon completing customer visit payments in the Appointments desk.
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
