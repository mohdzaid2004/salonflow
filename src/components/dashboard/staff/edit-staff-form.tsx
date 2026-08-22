'use client';

import { useTransition, useState } from 'react';
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
import { Loader2, CheckCircle, User, Phone, IdCard, Calendar, MapPin, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Staff } from '@/lib/data';
import { PREDEFINED_ROLES } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const editStaffFormSchema = z.object({
  name: z.string().min(1, 'Staff name is required.'),
  role: z.string().optional(),
  aadharNumber: z.union([z.string().length(12, { message: "Must be 12 digits." }), z.literal("")]).optional(),
  phone: z.union([z.string().length(10, { message: "Must be 10 digits." }), z.literal("")]).optional(),
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
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const salonId = user?.uid;

  const form = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffFormSchema),
    defaultValues: {
      name: staff.name || '',
      role: staff.role || '',
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

      setIsSuccess(true);
    });
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center">
        <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <CheckCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Staff Member Updated!</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            The details for &apos;{form.getValues('name')}&apos; have been saved.
          </p>
        </div>
        <Button onClick={() => setOpen(false)} className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-xs font-bold mt-2">
          Done
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          
          {/* Staff Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-0.5 sm:col-span-2">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Staff Name <span className="text-rose-500">*</span>
                </FormLabel>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <FormControl>
                    <Input placeholder="e.g., Priya Sharma" className="h-8 pl-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Role */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Role / Designation</FormLabel>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <FormControl>
                    <Input placeholder="e.g. Hair Stylist, Beautician" className="h-8 pl-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Phone Number</FormLabel>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <FormControl>
                    <Input placeholder="9876543210" className="h-8 pl-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Aadhar */}
          <FormField
            control={form.control}
            name="aadharNumber"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Aadhar Number</FormLabel>
                <FormControl>
                  <Input placeholder="12-digit number" className="h-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                </FormControl>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* DOB */}
          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" className="h-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                </FormControl>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="space-y-0.5 sm:col-span-2">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Address</FormLabel>
                <FormControl>
                  <Input placeholder="City, locality, state" className="h-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                </FormControl>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

        </div>

        <Button 
          type="submit" 
          className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-2" 
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </form>
    </Form>
  );
}

