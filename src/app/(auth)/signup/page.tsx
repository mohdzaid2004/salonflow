'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth, useFirestore } from '@/firebase';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  Zap,
  Cloud
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Logo } from '@/components/logo';

const signupFormSchema = z.object({
  fullName: z.string().min(1, { message: 'Please enter your full name.' }),
  salonName: z.string().min(2, { message: 'Salon name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid 10-digit phone number.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(6, { message: 'Please confirm your password.' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

const timeoutPromise = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
};

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: '',
      salonName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = form.watch('password') || '';

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!passwordValue) return 0;
    let score = 0;
    if (passwordValue.length >= 6) score += 1;
    if (passwordValue.length >= 8 && (/[A-Z]/.test(passwordValue) || /[0-9]/.test(passwordValue))) score += 1;
    if (passwordValue.length >= 8 && /[A-Z]/.test(passwordValue) && /[0-9]/.test(passwordValue) && /[^A-Za-z0-9]/.test(passwordValue)) score += 1;
    return score; // 0, 1 (Weak), 2 (Medium), 3 (Strong)
  }, [passwordValue]);

  const passwordStrengthLabel = useMemo(() => {
    switch (passwordStrength) {
      case 1:
        return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };
      case 2:
        return { label: 'Medium', color: 'bg-amber-500', text: 'text-amber-600' };
      case 3:
        return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
      default:
        return { label: '', color: 'bg-slate-200', text: 'text-slate-400' };
    }
  }, [passwordStrength]);

  const setupSalonData = async (user: any, fullName: string, email: string, phone: string, salonName: string) => {
    if (!firestore) return;
    const salonId = user.uid;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 15);

    // 1. Create root user profile document
    const rootUserRef = doc(firestore, `users`, user.uid);
    await timeoutPromise(
      setDoc(rootUserRef, {
        uid: user.uid,
        fullName: fullName,
        email: email,
        phone: phone,
        salonName: salonName,
        role: 'owner',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }),
      8000,
      "Database write timeout. Please verify that Cloud Firestore is configured."
    );

    // 2. Create subcollection user document
    const userRef = doc(firestore, `salons/${salonId}/users`, user.uid);
    await timeoutPromise(
      setDoc(userRef, {
        name: fullName,
        role: 'owner',
        email: email,
        salonId: salonId,
      }),
      8000,
      "Database write timeout. Please verify that Cloud Firestore is configured."
    );

    // 3. Create the salon document
    const salonRef = doc(firestore, 'salons', salonId);
    await timeoutPromise(
      setDoc(salonRef, {
        salonId: salonId,
        name: salonName,
        ownerId: user.uid,
        appointmentsEnabled: true,
        loyaltyProgramEnabled: true,
        automatedWhatsappEnabled: true,
        loyaltyPointsRatio: 10,
        address: '',
        city: '',
        state: '',
        phone: phone,
        logoUrl: '',
        languageDefault: 'en',
        timezone: 'IST',
        subscriptionPlanId: 'starter',
        billingStatus: 'trialing',
        businessHours: JSON.stringify({}),
        trialEndsAt: Timestamp.fromDate(trialEndsAt),
        themeColor: '275 100% 25.3%',
      }),
      8000,
      "Database write timeout. Please verify that Cloud Firestore is configured."
    );

    // 4. Update display name
    await updateProfile(user, { displayName: fullName });
  };

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Initialization Error',
        description: 'Firebase service is initializing. Please try again in a moment.',
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      await setupSalonData(user, data.fullName, data.email, data.phone, data.salonName);

      // Sign out user to allow clean redirect to login page
      await signOut(auth);

      toast({
        title: 'Salon Created Successfully! 🎉',
        description: 'Your 15-day free trial has been activated. Please log in to continue.',
      });

      router.push('/login');
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = 'An unexpected error occurred during signup. Please try again.';
      
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email address already exists. Please log in.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please use at least 6 characters with mixed characters.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/Password signup is disabled in your Firebase console.';
            break;
          default:
            errorMessage = error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!auth || !firestore) return;
    setIsGoogleSubmitting(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if salon already exists
      const salonDoc = await getDoc(doc(firestore, 'salons', user.uid));
      if (!salonDoc.exists()) {
        const defaultSalonName = `${user.displayName || 'My'} Salon`;
        await setupSalonData(
          user, 
          user.displayName || 'Salon Owner', 
          user.email || '', 
          user.phoneNumber || '', 
          defaultSalonName
        );
      }

      toast({
        title: 'Welcome to SalonFlow! ✨',
        description: 'Signed in with Google successfully.',
      });

      router.push('/dashboard/home');
    } catch (error: any) {
      console.error("Google sign in error:", error);
      let message = "Could not complete Google sign-in. Please try again or use email signup.";
      if (error.code === 'auth/popup-closed-by-user') {
        message = "Sign-in popup was closed before completing.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google Sign-In is not enabled in your Firebase Authentication console.";
      }
      toast({
        variant: 'destructive',
        title: 'Google Sign-in Failed',
        description: message,
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FC] font-sans flex flex-col justify-center py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1320px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* ================= LEFT SECTION: Branding & Value Props ================= */}
        <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1 px-2 sm:px-6 py-4 relative">
          
          {/* Ambient Glow */}
          <div className="absolute -top-12 -left-12 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Social Proof Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-purple-200/80 shadow-sm text-xs font-semibold text-purple-900 w-fit mb-6">
            <div className="flex -space-x-1">
              <span className="inline-block w-4 h-4 rounded-full bg-purple-500 text-[9px] text-white flex items-center justify-center font-bold">★</span>
              <span className="inline-block w-4 h-4 rounded-full bg-indigo-500 text-[9px] text-white flex items-center justify-center font-bold">★</span>
              <span className="inline-block w-4 h-4 rounded-full bg-pink-500 text-[9px] text-white flex items-center justify-center font-bold">★</span>
            </div>
            <span>Trusted by 500+ modern salons across India</span>
          </div>

          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-600/30 text-white p-2.5">
              <Logo className="h-full w-full text-white" />
            </div>
            <div>
              <span className="font-headline text-3xl font-extrabold tracking-tight text-slate-900">
                Salon<span className="text-purple-700">Flow</span>
              </span>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-purple-600">Enterprise Salon OS</span>
            </div>
          </div>

          {/* Headline & Subhead */}
          <div className="space-y-3 mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Manage Your Salon <br />
              <span className="bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                Smarter, Faster & Effortlessly
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-normal">
              The modern all-in-one operating system for high-growth salons, spas, and styling studios. From appointment booking to GST billing and customer loyalty.
            </p>
          </div>

          {/* 4 Luxury Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
            
            {/* Feature 1 */}
            <div className="group flex items-start gap-3.5 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-purple-100/90 shadow-sm hover:shadow-lg hover:border-purple-300 hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-2.5 rounded-xl bg-purple-100/70 text-purple-700 group-hover:scale-110 transition-transform shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Smart Appointments</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">Real-time chair booking & queue management.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group flex items-start gap-3.5 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-indigo-100/90 shadow-sm hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-2.5 rounded-xl bg-indigo-100/70 text-indigo-600 group-hover:scale-110 transition-transform shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer CRM</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">Loyalty points, history & automated reminders.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group flex items-start gap-3.5 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-violet-100/90 shadow-sm hover:shadow-lg hover:border-violet-300 hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-2.5 rounded-xl bg-violet-100/70 text-violet-700 group-hover:scale-110 transition-transform shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Instant GST Billing</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">Generate digital bills & split staff commissions.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group flex items-start gap-3.5 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-100/90 shadow-sm hover:shadow-lg hover:border-pink-300 hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-2.5 rounded-xl bg-pink-100/70 text-pink-600 group-hover:scale-110 transition-transform shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Business Analytics</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">Daily revenue, top stylists & inventory alerts.</p>
              </div>
            </div>

          </div>

          {/* Mini Live Preview Metric Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl shadow-purple-950/20 mb-8 border border-white/10 hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-purple-300 font-semibold">Today's Salon Revenue</div>
                <div className="text-lg font-extrabold tracking-tight">₹24,850.00 <span className="text-xs font-medium text-emerald-400 ml-1">+18.4% today</span></div>
              </div>
            </div>
            <div className="text-right pl-4 border-l border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-purple-300 font-semibold">Staff Active</div>
              <div className="text-base font-bold">8 Stylists on Duty</div>
            </div>
          </div>

          {/* Value Pills / Checklist */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Cloud Based
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> 100% Secure Data
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Mobile & Tablet Ready
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Real-Time Sync
            </span>
          </div>

        </div>

        {/* ================= RIGHT SECTION: Premium Signup Card ================= */}
        <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-950/10 border border-slate-100/80 transition-all">
            
            {/* Card Header */}
            <div className="text-center sm:text-left mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Start 15-Day Free Trial
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Create your Salon
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Get started with your new salon management dashboard.
              </p>
            </div>

            {/* Google Signup Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm gap-3 shadow-sm transition-all mb-5"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                  or with email
                </span>
              </div>
            </div>

            {/* Main Signup Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* 2-Column Name and Salon Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Doe" 
                            className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-600 transition-all text-sm" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Salon Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Envy Studio" 
                            className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-600 transition-all text-sm" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email Address */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="owner@example.com" 
                          className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-600 transition-all text-sm" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Phone Number with +91 */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Phone Number
                      </FormLabel>
                      <div className="flex items-center">
                        <span className="inline-flex h-11 items-center gap-1.5 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100/70 px-3 text-xs font-bold text-slate-600 select-none">
                          🇮🇳 +91
                        </span>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="9876543210"
                            className="h-11 rounded-l-none rounded-r-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-600 transition-all text-sm"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* 2-Column Password and Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Password
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="h-11 rounded-xl bg-slate-50/50 border-slate-200 pr-10 focus:bg-white focus:ring-2 focus:ring-purple-600 transition-all text-sm"
                              {...field}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Confirm Password
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="h-11 rounded-xl bg-slate-50/50 border-slate-200 pr-10 focus:bg-white focus:ring-2 focus:ring-purple-600 transition-all text-sm"
                              {...field}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password Strength Indicator */}
                {passwordValue.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Password strength:</span>
                      <span className={`font-semibold ${passwordStrengthLabel.text}`}>
                        {passwordStrengthLabel.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${passwordStrength >= 1 ? passwordStrengthLabel.color : 'bg-slate-200'}`} />
                      <div className={`h-full transition-all duration-300 ${passwordStrength >= 2 ? passwordStrengthLabel.color : 'bg-slate-200'}`} />
                      <div className={`h-full transition-all duration-300 ${passwordStrength >= 3 ? passwordStrengthLabel.color : 'bg-slate-200'}`} />
                    </div>
                  </div>
                )}

                {/* Primary CTA Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-purple-600/25 transition-all mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating your salon...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                {/* Existing Account / Login Link */}
                <p className="text-center text-sm text-slate-600 pt-2 font-medium">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-purple-700 hover:text-purple-800 underline underline-offset-4 transition-colors"
                  >
                    Sign In
                  </Link>
                </p>

              </form>
            </Form>

            {/* Trust Footer inside card */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Secure Data
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-slate-400" /> Quick Setup
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-slate-400" /> Cloud-based
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

