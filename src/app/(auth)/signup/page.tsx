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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import Link from 'next/link';

// Add salon name to the schema
const signupFormSchema = z.object({
  salonName: z.string().min(2, { message: 'Salon name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
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

export default function SignupPage({}) {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      salonName: '',
      email: '',
      password: '',
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
          // These operations are critical for the user's account to be functional.
          // We run them sequentially to ensure the salon and user profile are created.
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 15);

          // 1. Create the user's own profile document. This is required for security rules.
          const userRef = doc(firestore, `salons/${salonId}/users`, user.uid);
          await timeoutPromise(
            setDoc(userRef, {
              name: 'Owner',
              role: 'owner',
              email: user.email,
              salonId: salonId,
            }),
            8000,
            "Database write timeout. Please verify that Cloud Firestore is created and billing (Blaze plan) is enabled in your Firebase Console."
          );

          // 2. Create the salon document.
          const salonRef = doc(firestore, 'salons', salonId);
          await timeoutPromise(
            setDoc(salonRef, {
              salonId: salonId,
              name: data.salonName,
              ownerId: user.uid,
              appointmentsEnabled: true,
              loyaltyProgramEnabled: true,
              loyaltyPointsRatio: 10,
              address: '',
              city: '',
              state: '',
              phone: '',
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

          // 3. Update the user's auth profile.
          await updateProfile(user, { displayName: "Owner" });

          toast({
            title: 'Success!',
            description: 'Your salon has been created. Redirecting to dashboard...',
          });

          // 4. Redirect to the dashboard.
          router.push('/dashboard/home');

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
              errorMessage = 'This email is already registered.';
              break;
            case 'auth/weak-password':
              errorMessage = 'The password is too weak.';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Please enter a valid email address.';
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
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Create your Salon</CardTitle>
        <CardDescription>
          Get started with your new salon management dashboard.
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
                    <Input placeholder="Your Salon's Name" {...field} />
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
                    <Input placeholder="owner@example.com" {...field} />
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
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign Up
            </Button>
             <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Log In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
