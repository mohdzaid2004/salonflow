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
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import type { Staff } from '@/lib/data';

const editStaffFormSchema = z.object({
  name: z.string().min(1, 'Staff name is required.'),
  aadharNumber: z.union([z.string().length(12, { message: "Aadhar number must be 12 digits." }), z.literal("")]).optional(),
  phone: z.union([z.string().length(10, { message: "Phone number must be 10 digits." }), z.literal("")]).optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
});


type EditStaffFormValues = z.infer<typeof editStaffFormSchema>;

export function EditStaffForm({
  staff,
  setOpen,
}: {
  staff: Staff;
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const salonId = user?.uid;

  const form = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffFormSchema),
    defaultValues: {
      name: staff.name || '',
      aadharNumber: staff.aadharNumber || '',
      phone: staff.phone || '',
      address: staff.address || '',
      dob: staff.dob || '',
    },
  });

  function onSubmit(data: EditStaffFormValues) {
    startTransition(() => {
      if (!salonId || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User or database not available.',
        });
        return;
      }
      
      const staffRef = doc(firestore, `salons/${salonId}/staff`, staff.id);
      updateDocumentNonBlocking(staffRef, data);

      toast({
        title: 'Success!',
        description: `${data.name}'s details have been updated.`,
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
                <FormLabel>Staff Name <span className="text-red-500">*</span></FormLabel>
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
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
