'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';

const addStaffFormSchema = z.object({
  name: z.string().min(2, 'Staff name must be at least 2 characters.'),
  aadharNumber: z.string().length(12, 'Aadhar number must be 12 digits.'),
  phone: z.string().length(10, 'Phone number must be 10 digits.'),
  address: z.string().min(5, 'Address is required.'),
  dob: z.string().min(1, 'Date of birth is required.'),
});

type AddStaffFormValues = z.infer<typeof addStaffFormSchema>;

export function AddStaffForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const salonId = user?.uid;

  const form = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffFormSchema),
    defaultValues: {
      name: '',
      aadharNumber: '',
      phone: '',
      address: '',
      dob: '',
    },
  });

  function onSubmit(data: AddStaffFormValues) {
    startTransition(() => {
      if (!salonId || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User or database not available.',
        });
        return;
      }

      const staffData = {
        ...data,
        salonId,
      };

      const staffRef = collection(firestore, `salons/${salonId}/staff`);
      addDocumentNonBlocking(staffRef, staffData);

      toast({
        title: 'Success!',
        description: `${data.name} has been added to your staff.`,
      });
      setOpen(false);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Priya Sharma" {...field} />
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
                  <Input placeholder="10-digit mobile number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="aadharNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aadhar Card Number</FormLabel>
                <FormControl>
                  <Input placeholder="12-digit Aadhar number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter full address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Staff Member
        </Button>
      </form>
    </Form>
  );
}

    