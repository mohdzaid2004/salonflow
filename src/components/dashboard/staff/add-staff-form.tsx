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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection } from 'firebase/firestore';

const addStaffFormSchema = z.object({
  name: z.string().min(2, 'Staff name must be at least 2 characters.'),
  specialties: z.string().min(1, 'Please enter at least one specialty.'),
  workingHours: z.string().min(1, 'Please describe their working hours.'),
  commissionPercent: z.coerce
    .number()
    .min(0, 'Commission must be 0 or more.')
    .max(100, 'Commission cannot exceed 100.'),
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
      specialties: '',
      workingHours: 'Mon-Fri: 9am-6pm',
      commissionPercent: 10,
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
        specialties: data.specialties.split(',').map((s) => s.trim()),
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            name="specialties"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialties</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Hair Coloring, Bridal Makeup"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Enter specialties separated by commas.</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="workingHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Working Hours</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Mon-Fri: 9am-6pm, Sat: 10am-4pm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="commissionPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commission (%)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 10" {...field} />
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
