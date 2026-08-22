'use client';

import { useState, useTransition, useMemo } from 'react';
import { useAuth, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import { 
  Building, 
  Clock, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  Trash2, 
  Save, 
  Sparkles, 
  QrCode, 
  Phone, 
  Mail, 
  MapPin, 
  Percent,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";
import { deleteUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
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
  const [salonName, setSalonName] = useState(salon?.name || 'Toni & Guy');
  const [tagline, setTagline] = useState('Premium Unisex Salon & Spa');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState(user?.email || 'contact@toniandguy-salon.com');
  const [address, setAddress] = useState('Plot 42, Bandra West, Mumbai, Maharashtra 400050');
  const [gstin, setGstin] = useState('27AABCT3518Q1ZV');
  
  // Working Hours State
  const [openTime, setOpenTime] = useState('09:30 AM');
  const [closeTime, setCloseTime] = useState('08:30 PM');
  const [weeklyOff, setWeeklyOff] = useState('Monday');

  // Payments State
  const [upiId, setUpiId] = useState('salonflow.business@okaxis');
  const [gstPercent, setGstPercent] = useState(18);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonDocRef) return;
    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, {
          name: salonName,
        });
        toast({ title: 'Settings Saved', description: 'Salon profile details updated successfully.' });
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
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
          Salon Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Configure your business profile, operating hours, billing & GST, and account security.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'profile', label: 'Salon Profile', icon: Building },
          { id: 'hours', label: 'Working Hours', icon: Clock },
          { id: 'payments', label: 'Billing & UPI', icon: CreditCard },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security & Danger Zone', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Salon Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Business Information</h2>
            <p className="text-xs text-slate-400">Your salon brand name, contact info, and tax identity</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Salon Business Name</label>
              <input
                type="text"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600 font-semibold text-slate-900"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Brand Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Business Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Full Salon Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">GSTIN / Tax Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Working Hours */}
      {activeTab === 'hours' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Salon Operating Hours</h2>
            <p className="text-xs text-slate-400">Set daily opening, closing times, and weekly closures for online booking slots</p>
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
              <select
                value={weeklyOff}
                onChange={(e) => setWeeklyOff(e.target.value)}
                className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200"
              >
                <option value="None">Open All 7 Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => toast({ title: 'Hours Saved', description: 'Salon shift schedule updated.' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Hours</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Billing & UPI */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Payment & Tax Configuration</h2>
            <p className="text-xs text-slate-400">Configure UPI QR codes, POS payment methods, and GST invoice parameters</p>
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

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Default GST Rate (%)</label>
              <input
                type="number"
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value))}
                className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => toast({ title: 'Payments Saved', description: 'UPI & GST settings updated.' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Payment Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Automated Client Notifications</h2>
            <p className="text-xs text-slate-400">Send automatic booking confirmations, reminders, and invoices via WhatsApp</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">WhatsApp Booking Confirmation</span>
                <span className="text-[11px] text-slate-500">Send immediate booking confirmation with stylist & time</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Appointment Reminder (2 hours prior)</span>
                <span className="text-[11px] text-slate-500">Reduce no-shows with timed WhatsApp alerts</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Digital GST Invoice Link</span>
                <span className="text-[11px] text-slate-500">Auto-dispatch PDF bill link upon payment settlement</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Security & Danger Zone */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-rose-200 space-y-4">
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
            <AlertDialogContent className="rounded-3xl p-6 bg-white">
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
