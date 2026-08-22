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
import { Loader2, CheckCircle, Scissors, Clock, IndianRupee, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Service } from '@/lib/data';
import { SERVICE_CATEGORIES } from './add-service-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const editServiceFormSchema = z.object({
  name: z.string().min(2, 'Service name is required.'),
  category: z.string().optional(),
  duration: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
  assignedStaff: z.string().optional(),
});

type EditServiceFormValues = z.infer<typeof editServiceFormSchema>;

export function EditServiceForm({
  service,
  setOpen,
}: {
  service: Service;
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const salonId = user?.uid;

  const form = useForm<EditServiceFormValues>({
    resolver: zodResolver(editServiceFormSchema),
    defaultValues: {
      name: service.name,
      category: 'Hair',
      duration: '45 mins',
      price: service.price,
      assignedStaff: 'All Stylists',
    },
  });

  function onSubmit(data: EditServiceFormValues) {
    startTransition(() => {
      if (!salonId || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User or database not available.',
        });
        return;
      }

      const serviceRef = doc(firestore, `salons/${salonId}/services`, service.id);
      updateDocumentNonBlocking(serviceRef, data);

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
          <h3 className="text-base font-bold text-slate-900">Service Updated!</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            The changes for &apos;{form.getValues('name')}&apos; have been saved.
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
          
          {/* Service Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-0.5 sm:col-span-2">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Service Name <span className="text-rose-500">*</span>
                </FormLabel>
                <div className="relative">
                  <Scissors className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <FormControl>
                    <Input placeholder="e.g., Haircut" className="h-8 pl-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl text-xs">
                    {SERVICE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Duration</FormLabel>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <FormControl>
                    <Input placeholder="e.g., 45 mins" className="h-8 pl-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Price */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Price (INR) <span className="text-rose-500">*</span>
                </FormLabel>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <FormControl>
                    <Input type="number" placeholder="250" className="h-8 pl-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] text-rose-500" />
              </FormItem>
            )}
          />

          {/* Assigned Staff */}
          <FormField
            control={form.control}
            name="assignedStaff"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Assigned Staff</FormLabel>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <FormControl>
                    <Input placeholder="e.g. All Stylists" className="h-8 pl-8 rounded-xl text-xs bg-slate-50/50 border-slate-200" {...field} />
                  </FormControl>
                </div>
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
