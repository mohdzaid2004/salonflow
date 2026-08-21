'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Logo } from '@/components/logo';

const signupFormSchema = z.object({
  fullName: z.string().min(1, { message: 'Full name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid 10-digit phone number.' }),
  salonName: z.string().min(2, { message: 'Salon name must be at least 2 characters.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z
    .string()
    .min(6, { message: 'Confirm password is required.' }),
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

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      salonName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (data: SignupFormValues) => {
    setIsSubmitting(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase not initialized. Please try again later.',
      });
      setIsSubmitting(false);
      return;
    }
    
    createUserWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        const salonId = user.uid;
        
        try {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 15);

          // 1. Create root user profile document
          const rootUserRef = doc(firestore, `users`, user.uid);
          await timeoutPromise(
            setDoc(rootUserRef, {
              uid: user.uid,
              fullName: data.fullName,
              email: data.email,
              phone: data.phone,
              salonName: data.salonName,
              role: 'owner',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            }),
            8000,
            "Database write timeout. Please verify that Cloud Firestore is created and billing (Blaze plan) is enabled in your Firebase Console."
          );

          // 2. Create subcollection user document for existing system logic
          const userRef = doc(firestore, `salons/${salonId}/users`, user.uid);
          await timeoutPromise(
            setDoc(userRef, {
              name: data.fullName,
              role: 'owner',
              email: user.email,
              salonId: salonId,
            }),
            8000,
            "Database write timeout. Please verify that Cloud Firestore is created and billing (Blaze plan) is enabled in your Firebase Console."
          );

          // 3. Create the salon document
          const salonRef = doc(firestore, 'salons', salonId);
          await timeoutPromise(
            setDoc(salonRef, {
              salonId: salonId,
              name: data.salonName,
              ownerId: user.uid,
              appointmentsEnabled: true,
              loyaltyProgramEnabled: true,
              automatedWhatsappEnabled: true,
              loyaltyPointsRatio: 10,
              address: '',
              city: '',
              state: '',
              phone: data.phone,
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
            "Database write timeout. Please verify that Cloud Firestore is created and billing (Blaze plan) is enabled in your Firebase Console."
          );

          // 4. Update the user's auth profile displayName
          await updateProfile(user, { displayName: data.fullName });

          // 5. Sign out user to prevent automatic login redirect
          await signOut(auth);

          toast({
            title: 'Account Created Successfully!',
            description: 'Your salon profile has been configured. Please log in with your email and password.',
          });

          // 6. Redirect to login
          router.push('/login');

        } catch (setupError: any) {
          console.error("Error setting up salon data:", setupError);
          let desc = "Your account was created, but we couldn't set up your salon. Please contact support.";
          if (setupError.message && (setupError.message.includes("timeout") || setupError.message.includes("Firebase"))) {
            desc = setupError.message;
          } else if (setupError.code === "permission-denied" || (setupError.message && setupError.message.includes("permission-denied"))) {
            desc = "Database write permission denied. Please ensure your Cloud Firestore API is enabled and database is initialized.";
          }
          toast({
            variant: 'destructive',
            title: 'Setup Failed',
            description: desc,
          });
        }
      })
      .catch((error) => {
        let errorMessage = 'An unknown error occurred. Please try again.';
        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/email-already-in-use':
              errorMessage = 'This email is already registered. Please log in.';
              break;
            case 'auth/weak-password':
              errorMessage = 'The password is too weak.';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Please enter a valid email address.';
              break;
            case 'auth/operation-not-allowed':
              errorMessage = 'Email/Password authentication is disabled in your Firebase Console. Please go to Authentication > Sign-in method and enable Email/Password.';
              break;
          }
        }
        toast({
          variant: 'destructive',
          title: 'Sign-up Failed',
          description: errorMessage,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="flex min-h-screen w-full font-sans">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col w-1/2 relative bg-purple-50 text-slate-900 p-12">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1000" 
            alt="Salon Interior" 
            className="h-full w-full object-cover opacity-10" 
          />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-20">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold text-slate-900">SalonFlow</span>
          </div>
          
          <div className="mt-auto mb-20 max-w-md">
            <h1 className="text-4xl font-bold mb-6">Manage Your Salon<br/><span className="text-primary">Smarter & Faster</span></h1>
            <p className="text-lg text-slate-600 mb-10 border-l-2 border-primary pl-4">All-in-one salon management system to handle appointments, billing, staff, customers & more — effortlessly.</p>
            
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-primary/10 rounded-full text-primary mt-1 shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Smart Appointments</h3>
                  <p className="text-sm text-slate-500 mt-1">Manage bookings and schedules with ease.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-primary/10 rounded-full text-primary mt-1 shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Customer Management</h3>
                  <p className="text-sm text-slate-500 mt-1">Build strong relationships and keep customers coming back.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-primary/10 rounded-full text-primary mt-1 shadow-sm">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Billing & Reports</h3>
                  <p className="text-sm text-slate-500 mt-1">Generate invoices and get powerful insights.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-primary/10 rounded-full text-primary mt-1 shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Grow Your Business</h3>
                  <p className="text-sm text-slate-500 mt-1">Track performance and grow your salon revenue.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} SalonFlow. All rights reserved.
          </div>
        </div>
      </div>
      
      {/* Right Panel - Form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold">SalonFlow</span>
          </div>

          <Card className="border-0 shadow-xl rounded-3xl p-2 sm:p-6 bg-white ring-1 ring-slate-100">
            <CardHeader className="space-y-3 text-center pt-8">
              <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <CardTitle className="text-3xl font-bold">Create your Salon</CardTitle>
              <CardDescription className="text-sm">
                Get started with your new salon management dashboard.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Full Name</FormLabel>
                        <FormControl>
                          <Input className="bg-zinc-50" placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Salon Name</FormLabel>
                        <FormControl>
                          <Input className="bg-zinc-50" placeholder="Your Salon's Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Email Address</FormLabel>
                        <FormControl>
                          <Input className="bg-zinc-50" placeholder="owner@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Phone Number</FormLabel>
                        <FormControl>
                          <Input className="bg-zinc-50" placeholder="10-digit mobile number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Password</FormLabel>
                        <FormControl>
                          <Input className="bg-zinc-50" type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Confirm Password</FormLabel>
                        <FormControl>
                          <Input className="bg-zinc-50" type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-5 pb-8">
                  <Button type="submit" className="w-full h-12 text-md rounded-xl mt-4" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Sign Up
                  </Button>
                  
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-zinc-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-zinc-500">or</span>
                    </div>
                  </div>

                  <p className="text-center text-sm text-zinc-600">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="font-semibold text-primary hover:underline"
                    >
                      Log In
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
