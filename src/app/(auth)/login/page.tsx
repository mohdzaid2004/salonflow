'use client';

import { useEffect, useState } from 'react';
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
import { useAuth, useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import { Logo } from '@/components/logo';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage({}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Fallback timer in case Firebase auth takes too long to load on client side
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Effect to redirect if user is logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard/home');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = (data: LoginFormValues) => {
    setIsSubmitting(true);
    signInWithEmailAndPassword(auth, data.email, data.password)
      .catch((error) => {
        if (error instanceof FirebaseError) {
          let errorMessage = 'An unknown error occurred. Please try again.';
          switch (error.code) {
            case 'auth/user-not-found':
              errorMessage = 'No account found with this email. Please sign up first.';
              break;
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
              errorMessage = 'Incorrect email or password.';
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
              errorMessage = 'Email/Password authentication is disabled in your Firebase Console. Please enable it in Authentication > Sign-in method.';
              break;
          }
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: errorMessage,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'An unexpected error occurred. Please try again.',
          });
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const showLoading = isUserLoading && !authTimeout;

  // Render a loading state while checking for user
  if (showLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full font-sans">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col w-5/12 relative bg-zinc-950 text-white px-12 py-10 overflow-hidden border-r border-zinc-900">
        <div className="absolute bottom-0 left-0 w-full h-[45%] bg-gradient-to-t from-black to-transparent z-0">
          <img 
            src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1000" 
            alt="Salon Interior" 
            className="w-full h-full object-cover object-bottom opacity-60 mix-blend-screen" 
          />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-12">
            <Logo className="h-8 w-8 text-white" />
            <span className="font-headline text-2xl font-bold">SalonFlow</span>
          </div>
          
          <div className="max-w-md mb-auto">
            <h1 className="text-4xl font-bold mb-6">Welcome to<br/><span className="text-primary">SalonFlow</span></h1>
            <p className="text-lg text-zinc-300 mb-10 border-l-2 border-primary pl-4">Smart salon management<br/>made simple.</p>
            
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-primary/20 rounded-full text-primary mt-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Manage Appointments</h3>
                  <p className="text-sm text-zinc-400 mt-1">Schedule and manage bookings effortlessly.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-primary/20 rounded-full text-primary mt-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Happy Customers</h3>
                  <p className="text-sm text-zinc-400 mt-1">Keep track of customers and build lasting relationships.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-primary/20 rounded-full text-primary mt-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Grow Your Business</h3>
                  <p className="text-sm text-zinc-400 mt-1">Insights and reports to scale your salon business.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} SalonFlow. All rights reserved.
          </div>
        </div>
      </div>
      
      {/* Right Panel - Form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 bg-zinc-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold">SalonFlow</span>
          </div>

          <Card className="border-0 shadow-xl rounded-3xl p-2 sm:p-6 bg-white">
            <CardHeader className="space-y-3 text-center pt-8">
              <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-2">
                <Logo className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
              <CardDescription className="text-sm">
                Enter your credentials to access your dashboard.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-5 pt-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Email</FormLabel>
                        <FormControl>
                          <Input className="h-12 bg-zinc-50" placeholder="name@example.com" {...field} />
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
                        <div className="flex items-center justify-between">
                          <FormLabel className="font-semibold">Password</FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <Input className="h-12 bg-zinc-50" type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-5 pb-8">
                  <Button type="submit" className="w-full h-12 text-md rounded-xl" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Log In
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
                    Don&apos;t have an account?{' '}
                    <Link
                      href="/signup"
                      className="font-semibold text-primary hover:underline"
                    >
                      Sign Up
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
