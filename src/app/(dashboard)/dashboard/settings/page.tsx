'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  Clock, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  Save, 
  Loader2, 
  Phone, 
  Mail, 
  MapPin, 
  IndianRupee, 
  Smartphone,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useAuth } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import type { Salon } from '@/lib/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState<'profile' | 'hours' | 'payments' | 'notifications' | 'security'>('profile');
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const salonId = user?.uid;
  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId, isUserLoading]);

  const { data: salon } = useDoc<Salon>(salonDocRef);

  // Settings State
  const [salonName, setSalonName] = useState('SalonFlow');
  const [tagline, setTagline] = useState('Premium Unisex Salon & Spa');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState('contact@salonflow.com');
  const [address, setAddress] = useState('Plot 42, Bandra West, Mumbai, Maharashtra 400050');
  
  // Working Hours State
  const [openTime, setOpenTime] = useState('09:30 AM');
  const [closeTime, setCloseTime] = useState('08:30 PM');
  const [weeklyOff, setWeeklyOff] = useState('Monday');

  // Payments State
  const [upiId, setUpiId] = useState('salonflow.business@okaxis');

  // WhatsApp & Feedback Settings
  const [whatsAppPhone, setWhatsAppPhone] = useState('+91 98765 43210');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('https://g.page/r/your-salon-review');
  const [autoInvoiceMsg, setAutoInvoiceMsg] = useState(true);
  const [autoFeedbackMsg, setAutoFeedbackMsg] = useState(true);

  useEffect(() => {
    if (salon) {
      if (salon.name) setSalonName(salon.name);
      if (salon.phone) setPhone(salon.phone);
      if ((salon as any).address) setAddress((salon as any).address);
      if ((salon as any).upiId) setUpiId((salon as any).upiId);
      if ((salon as any).googleReviewUrl) setGoogleReviewUrl((salon as any).googleReviewUrl);
      if ((salon as any).whatsAppPhone) setWhatsAppPhone((salon as any).whatsAppPhone);
    }
    if (user?.email) setEmail(user.email);
  }, [salon, user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonDocRef) return;
    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, {
          name: salonName,
          phone,
          address,
          upiId,
          googleReviewUrl,
          whatsAppPhone,
          updatedAt: new Date().toISOString(),
        });
        toast({ title: 'Settings Saved', description: 'Salon business configuration updated successfully.' });
      } catch (err) {
        toast({ title: 'Error', description: 'Could not save profile.', variant: 'destructive' });
      }
    });
  };

  const handleDeleteAccount = async () => {
    if (!user || !firestore || !auth) return;
    startDeleteTransition(async () => {
      try {
        const batch = writeBatch(firestore);
        const sRef = doc(firestore, 'salons', user.uid);
        batch.delete(sRef);
        await batch.commit();
        await deleteUser(user);
        toast({ title: "Account Deleted", description: "Your salon data has been removed." });
        router.push('/');
      } catch (err) {
        toast({ title: 'Error', description: 'Action required: Please re-login before deleting.', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 select-none max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
          Salon Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Configure your business profile, operating hours, billing & UPI, WhatsApp automation, and review links.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'profile', label: 'Salon Profile', icon: Building },
          { id: 'hours', label: 'Working Hours', icon: Clock },
          { id: 'payments', label: 'Billing & UPI', icon: CreditCard },
          { id: 'notifications', label: 'WhatsApp & Reviews', icon: Smartphone },
          { id: 'security', label: 'Security & Danger Zone', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Salon Business Information</h2>
            <p className="text-xs text-slate-400">Public profile details displayed on invoices and client booking portals</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Salon Legal / Brand Name</label>
              <input
                type="text"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Business Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Registered Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Salon Address & Location</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Hours */}
      {activeTab === 'hours' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Operating Hours & Weekly Off</h2>
            <p className="text-xs text-slate-400">Controls appointment slot availability for clients and staff scheduling</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Opening Time</label>
              <input
                type="text"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Closing Time</label>
              <input
                type="text"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Weekly Holiday</label>
              <input
                type="text"
                value={weeklyOff}
                onChange={(e) => setWeeklyOff(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => toast({ title: 'Hours Saved', description: 'Operating schedule updated.' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Billing & UPI */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Payment & Billing Configuration</h2>
            <p className="text-xs text-slate-400">Configure UPI QR codes, POS payment methods, and invoice parameters</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Salon UPI VPA / ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Payment Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: WhatsApp & Reviews */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">WhatsApp Automation & Google Reviews</h2>
            <p className="text-xs text-slate-400">Configure automated post-payment WhatsApp bills and client feedback links</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Salon WhatsApp Business Number</label>
              <input
                type="text"
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Google Review Redirect Link</label>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/your-salon/review"
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Post-Payment WhatsApp Invoice</span>
                <span className="text-[11px] text-slate-500">Auto-send digital bill receipt link to client upon payment confirmation</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Client Feedback Link Dispatch</span>
                <span className="text-[11px] text-slate-500">Attach 5-star rating link to post-payment message and route high ratings to Google Reviews</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Active
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save WhatsApp Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Security & Danger Zone */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-rose-200 space-y-4">
          <div className="border-b border-rose-100 pb-3">
            <h2 className="text-base font-bold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </h2>
            <p className="text-xs text-slate-400">Permanently delete your account and all associated salon data.</p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Deleting your salon account will remove all customers, service history, staff records, appointments, and billing data immediately. This action cannot be reversed.
          </p>

          <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmation('')}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all"
              >
                Delete Salon Account
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl p-5 sm:p-6 bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold text-slate-900">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500">
                  To confirm permanent deletion, type <strong className="text-slate-900 font-bold">DELETE</strong> in the box below.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder='Type "DELETE"'
                className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono my-2"
              />
              <AlertDialogFooter className="pt-2">
                <AlertDialogCancel className="h-8 rounded-xl text-xs font-semibold">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  className="h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {isDeleting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  I understand, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

    </div>
  );
}
