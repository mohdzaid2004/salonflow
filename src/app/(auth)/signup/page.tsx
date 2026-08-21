'use client';

import { useState } from 'react';
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
  User, 
  Store, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Cloud, 
  Smartphone, 
  Zap, 
  Check, 
  Gift, 
  ArrowRight,
  ChevronDown
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
    <div className="min-h-screen w-full bg-[#0B0813] font-sans flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1360px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* ================= LEFT SECTION: Dark Luxury Branding ================= */}
        <div className="lg:col-span-6 flex flex-col justify-between h-full py-4 lg:py-8 px-2 sm:px-6 relative order-2 lg:order-1">
          
          {/* Background Salon Image at Bottom */}
          <div className="absolute inset-x-0 bottom-0 h-96 pointer-events-none -z-0 opacity-40 overflow-hidden rounded-3xl">
            <img 
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200" 
              alt="Salon Interior" 
              className="w-full h-full object-cover object-bottom mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0813] via-[#0B0813]/80 to-transparent" />
          </div>

          <div className="relative z-10">
            {/* Top Brand Logo & Pill */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white p-2">
                <Logo className="h-full w-full text-white" />
              </div>
              <span className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Salon<span className="text-purple-400">Flow</span>
              </span>
              <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                Pro SaaS
              </span>
            </div>

            {/* Accent Line */}
            <div className="w-12 h-1 bg-purple-600 rounded-full mb-6" />

            {/* Main Headline */}
            <div className="space-y-2 mb-6">
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.12]">
                Manage Your Salon <br />
                <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                  Smarter & Faster
                </span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg pt-1">
                All-in-one salon management platform for appointments, billing, staff, customers, inventory and business growth.
              </p>
            </div>

            {/* 4 Dark Glass Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-8">
              
              {/* Feature 1 */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] hover:border-purple-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/40 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Smart Appointments</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Manage bookings effortlessly and reduce no-shows.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] hover:border-purple-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/40 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Customer Management</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Build stronger relationships and keep customers coming back.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] hover:border-purple-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/40 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Billing & Reports</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Generate invoices, track payments and get insightful reports.</p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] hover:border-purple-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/40 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Grow Your Business</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Track performance, analyze trends and grow your revenue.</p>
                </div>
              </div>

            </div>

            {/* Bottom Trust Icons Checklist */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-white/[0.08] text-xs font-medium text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" /> Secure Data
              </span>
              <span className="flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-purple-400 shrink-0" /> Cloud Based
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-purple-400 shrink-0" /> Mobile Friendly
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400 shrink-0" /> Real-Time Analytics
              </span>
            </div>

          </div>
        </div>

        {/* ================= RIGHT SECTION: Pure White Signup Card ================= */}
        <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">
          <div className="w-full max-w-[540px] bg-white rounded-[32px] p-6 sm:p-10 shadow-2xl text-slate-900 border border-white/20">
            
            {/* Top Badge */}
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold">
                <Gift className="w-3.5 h-3.5 text-purple-600" /> Start 15-Day Free Trial
              </div>
            </div>

            {/* Card Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Create your Salon
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Get started with your new salon management dashboard.
              </p>
            </div>

            {/* Google Signup Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm gap-3 shadow-sm transition-all mb-5 bg-white"
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
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                  OR CONTINUE WITH EMAIL
                </span>
              </div>
            </div>

            {/* Main Signup Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* 2-Column: Full Name & Salon Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                          FULL NAME
                        </FormLabel>
                        <div className="relative">
                          <User className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <FormControl>
                            <Input 
                              placeholder="John Doe" 
                              className="h-11 rounded-xl bg-white border-slate-200 pl-10 focus-visible:ring-2 focus-visible:ring-purple-600 text-sm placeholder:text-slate-400" 
                              {...field} 
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                          SALON NAME
                        </FormLabel>
                        <div className="relative">
                          <Store className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <FormControl>
                            <Input 
                              placeholder="Envy Studio" 
                              className="h-11 rounded-xl bg-white border-slate-200 pl-10 focus-visible:ring-2 focus-visible:ring-purple-600 text-sm placeholder:text-slate-400" 
                              {...field} 
                            />
                          </FormControl>
                        </div>
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
                      <FormLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        EMAIL ADDRESS
                      </FormLabel>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="owner@example.com" 
                            className="h-11 rounded-xl bg-white border-slate-200 pl-10 focus-visible:ring-2 focus-visible:ring-purple-600 text-sm placeholder:text-slate-400" 
                            {...field} 
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Phone Number with India Flag */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        PHONE NUMBER
                      </FormLabel>
                      <div className="flex items-center">
                        <div className="h-11 px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 flex items-center gap-1 text-xs font-semibold text-slate-700 select-none">
                          <span>🇮🇳</span>
                          <span>+91</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                        </div>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="9876543210"
                            className="h-11 rounded-l-none rounded-r-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-purple-600 text-sm placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* 2-Column: Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                          PASSWORD
                        </FormLabel>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <FormControl>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••••••"
                              className="h-11 rounded-xl bg-white border-slate-200 pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-purple-600 text-sm placeholder:text-slate-400"
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
                        <FormLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                          CONFIRM PASSWORD
                        </FormLabel>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <FormControl>
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••••••"
                              className="h-11 rounded-xl bg-white border-slate-200 pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-purple-600 text-sm placeholder:text-slate-400"
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

                {/* Password Rule Helper */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 stroke-[3]" />
                  <span>Use 8+ characters with a mix of letters, numbers & symbols</span>
                </div>

                {/* Primary CTA Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full h-12 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-base shadow-lg shadow-purple-600/30 transition-all mt-4 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating your salon...
                    </>
                  ) : (
                    <>
                      Create Account <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                {/* Login Link */}
                <p className="text-center text-xs sm:text-sm text-slate-600 pt-3 font-medium">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-purple-700 hover:text-purple-800 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>

              </form>
            </Form>

            {/* Bottom Security Trust Text */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Your data is safe and secure with us.</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
