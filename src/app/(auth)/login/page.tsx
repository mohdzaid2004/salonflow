'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { 
  Loader2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Cloud, 
  Zap, 
  Calendar, 
  Users, 
  TrendingUp, 
  Scissors,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Logo } from '@/components/logo';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid business email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
  rememberMe: z.boolean().default(true),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  // Fallback timer in case Firebase auth takes too long to load on client side
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Redirect if user is logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard/home');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: 'Welcome Back! ✨',
        description: 'Successfully signed in to your salon dashboard.',
      });
      router.push('/dashboard/home');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email. Please sign up first.';
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Incorrect email or password. Please try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/Password authentication is disabled in your Firebase Console.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !firestore) return;
    setIsGoogleSubmitting(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;

      // Check if salon document exists; if not, initialize starter profile
      const salonDoc = await getDoc(doc(firestore, 'salons', loggedUser.uid));
      if (!salonDoc.exists()) {
        const salonId = loggedUser.uid;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 15);

        await setDoc(doc(firestore, 'users', loggedUser.uid), {
          uid: loggedUser.uid,
          fullName: loggedUser.displayName || 'Salon Owner',
          email: loggedUser.email || '',
          salonName: `${loggedUser.displayName || 'My'} Salon`,
          role: 'owner',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });

        await setDoc(doc(firestore, 'salons', salonId), {
          salonId: salonId,
          name: `${loggedUser.displayName || 'My'} Salon`,
          ownerId: loggedUser.uid,
          appointmentsEnabled: true,
          loyaltyProgramEnabled: true,
          subscriptionPlanId: 'starter',
          billingStatus: 'trialing',
          trialEndsAt: Timestamp.fromDate(trialEndsAt),
          themeColor: '275 100% 25.3%',
        });
      }

      toast({
        title: 'Welcome Back! ✨',
        description: 'Successfully signed in with Google.',
      });

      router.push('/dashboard/home');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      let message = 'Could not sign in with Google. Please try again or use email.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Google sign-in popup was closed before completing.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Google Sign-In is not enabled in Firebase Authentication.';
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

  const showLoading = isUserLoading && !authTimeout;

  if (showLoading || user) {
    return (
      <div className="min-h-screen w-full bg-[#080B12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center animate-pulse">
            <Logo className="h-6 w-6 text-purple-400" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#080B12] font-sans flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden select-none">
      
      {/* ================= LEFT PANEL: Dark Premium OS Experience (~45%) ================= */}
      <div className="w-full lg:w-[45%] bg-[#080B12] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-white/[0.07] shrink-0 overflow-hidden">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding Section */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-700 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-600/30 p-2 border border-purple-400/30">
              <Logo className="h-full w-full text-white" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-headline text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase">
                SALON<span className="text-purple-400">FLOW</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-purple-950/80 text-purple-300 border border-purple-700/50">
                SALON BUSINESS OS
              </span>
            </div>
          </div>

          {/* Hero Headline */}
          <div className="space-y-3 mb-5">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.12]">
              The Operating System <br />
              <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-pink-400 bg-clip-text text-transparent">
                for Modern Salons.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-[480px]">
              SalonFlow brings appointments, billing, staff management, customer relationships, inventory and salon operations together in one seamless platform built for modern beauty businesses.
            </p>
          </div>
        </div>

        {/* Dashboard Product Preview (Floating Browser Window) */}
        <div className="relative z-10 my-4 hidden sm:block">
          <div className="rounded-2xl bg-zinc-950/80 border border-white/10 shadow-2xl shadow-purple-950/40 backdrop-blur-xl overflow-hidden">
            
            {/* Browser Top Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/90 border-b border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-zinc-800/80 border border-white/[0.06] text-[10px] text-zinc-400 font-mono">
                <Lock className="w-2.5 h-2.5 text-purple-400" />
                <span>app.salonflow.com/dashboard</span>
              </div>
              <div className="w-8" />
            </div>

            {/* Mock Dashboard Body */}
            <div className="p-3.5 sm:p-4 space-y-3">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-zinc-400">Today&apos;s Revenue</p>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5">₹18,450</p>
                  <span className="text-[9px] text-emerald-400 font-medium">↑ +14%</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-zinc-400">Appointments</p>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5">24</p>
                  <span className="text-[9px] text-purple-300 font-medium">8 Upcoming</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-zinc-400">Customers</p>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5">86</p>
                  <span className="text-[9px] text-emerald-400 font-medium">12 New</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-zinc-400">Active Staff</p>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5">8 Active</p>
                  <span className="text-[9px] text-zinc-400 font-medium">100% Ready</span>
                </div>
              </div>

              {/* Today's Appointments List */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between pb-1 text-[10px] font-semibold text-zinc-400 border-b border-white/[0.05]">
                  <span>Today&apos;s Live Appointments</span>
                  <span className="text-purple-400 font-mono">Live Feed</span>
                </div>

                {/* Appointment 1 */}
                <div className="flex items-center justify-between py-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400 text-[10px]">10:00 AM</span>
                    <span className="text-white font-medium">Haircut & Styling</span>
                    <span className="text-zinc-500">• Priya</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    CONFIRMED
                  </span>
                </div>

                {/* Appointment 2 */}
                <div className="flex items-center justify-between py-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400 text-[10px]">11:30 AM</span>
                    <span className="text-white font-medium">Hair Color & Spa</span>
                    <span className="text-zinc-500">• Ananya</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60">
                    IN SERVICE
                  </span>
                </div>

                {/* Appointment 3 */}
                <div className="flex items-center justify-between py-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400 text-[10px]">01:00 PM</span>
                    <span className="text-white font-medium">Organic Facial</span>
                    <span className="text-zinc-500">• Sneha</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                    COMPLETED
                  </span>
                </div>

                {/* Appointment 4 */}
                <div className="flex items-center justify-between py-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400 text-[10px]">03:30 PM</span>
                    <span className="text-white font-medium">Bridal Makeup</span>
                    <span className="text-zinc-500">• Aisha</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">
                    PENDING
                  </span>
                </div>

              </div>

            </div>

          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="relative z-10 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> 256-Bit SSL Encrypted
          </span>
          <span className="flex items-center gap-1">
            <Cloud className="w-3.5 h-3.5 text-purple-400" /> Cloud Sync
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-purple-400" /> 99.9% Uptime SLA
          </span>
        </div>

      </div>

      {/* ================= RIGHT PANEL: Clean White / Minimal SaaS Login Form (~55%) ================= */}
      <div className="w-full lg:w-[55%] bg-white flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[470px] space-y-6">
          
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Sign in to your SalonFlow account to manage your salon.
            </p>
          </div>

          {/* Main Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Business Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      BUSINESS EMAIL ADDRESS
                    </FormLabel>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="manager@salon.com"
                          className="h-12 rounded-xl bg-slate-50/70 border-slate-200 pl-10 focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:bg-white text-sm placeholder:text-slate-400 transition-all"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs text-rose-500" />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        SECURITY PASSWORD
                      </FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••••"
                          className="h-12 rounded-xl bg-slate-50/70 border-slate-200 pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:bg-white text-sm placeholder:text-slate-400 transition-all"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage className="text-xs text-rose-500" />
                  </FormItem>
                )}
              />

              {/* Remember Me Checkbox */}
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0 pt-0.5">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 rounded"
                      />
                    </FormControl>
                    <FormLabel className="text-xs text-slate-600 font-medium cursor-pointer select-none">
                      Keep me logged in
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Primary Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-600/25 hover:shadow-purple-600/35 transition-all mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in to SalonFlow...
                  </>
                ) : (
                  <>
                    SIGN IN TO SALONFLOW <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

            </form>
          </Form>

          {/* Social Login Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                OR CONTINUE WITH
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm gap-3 shadow-sm bg-white transition-all"
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

          {/* Sign Up Link */}
          <p className="text-center text-xs text-slate-600 font-medium pt-2">
            New to SalonFlow?{' '}
            <Link
              href="/signup"
              className="font-bold text-purple-600 hover:text-purple-700 transition-colors"
            >
              Create a Salon Account
            </Link>
          </p>

          {/* Subtle Trust Indicator */}
          <div className="text-center pt-2 text-[11px] text-slate-400 font-medium">
            Secure • Cloud-based • Built for modern salons
          </div>

        </div>
      </div>

    </div>
  );
}
