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
import Link from 'next/link';
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
import { updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import { seedInitialDataForSalon } from '../actions';

const signupFormSchema = z.object({
  salonName: z
    .string()
    .min(2, { message: 'Salon name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
  phone: z.string().min(10, 'Please enter a valid 10-digit phone number.'),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      salonName: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: "Owner" });

        // This is the critical step. It MUST succeed.
        const result = await seedInitialDataForSalon({
          userId: firebaseUser.uid,
          salonName: data.salonName,
          phone: data.phone,
          email: data.email,
        });

        // If the server action fails, we throw an error to be caught below.
        if (!result.success || result.error) {
          throw new Error(result.error || 'Failed to set up your salon account.');
        }

      } else {
        throw new Error('User account could not be created in Firebase.');
      }

      toast({
        title: 'Account Created!',
        description: "We're redirecting you to your new dashboard.",
      });
      // The onAuthStateChanged listener in FirebaseProvider will handle the redirect.
    } catch (error) {
      let errorMessage = 'An unknown error occurred. Please try again.';
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
          errorMessage =
            'This email is already in use. Please log in or use a different email.';
        }
      } else if (error instanceof Error) {
        // This will now catch errors from the seedInitialDataForSalon action
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Sign-up Failed',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Create your Salon Account</CardTitle>
        <CardDescription>
          Start your 14-day free trial. No credit card required.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
             <FormField
              control={form.control}
              name="salonName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salon Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Salon" {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      {...field}
                    />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Account
            </Button>
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline" prefetch={false}>
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
