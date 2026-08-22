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
import { Loader2, CheckCircle, Scissors, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const SERVICE_CATEGORIES = [
  'Hair',
  'Facial',
  'Skin Care',
  'Spa',
  'Hair Color',
  'Makeup',
  'Other',
];

const addServiceFormSchema = z.object({
  name: z.string().min(2, 'Service name is required.'),
  category: z.string().min(1, 'Category is required.'),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
  description: z.string().optional(),
});

type AddServiceFormValues = z.infer<typeof addServiceFormSchema>;

export function AddServiceForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [addedServiceName, setAddedServiceName] = useState('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const salonId = user?.uid;

  const form = useForm<AddServiceFormValues>({
    resolver: zodResolver(addServiceFormSchema),
    defaultValues: {
      name: '',
      category: 'Hair',
      price: 950,
      description: '',
    },
  });

  function onSubmit(data: AddServiceFormValues) {
    startTransition(() => {
      if (!salonId || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User or database not available.',
        });
        return;
      }

      const serviceData = {
        ...data,
        salonId,
        createdAt: new Date().toISOString(),
      };

      const servicesRef = collection(firestore, `salons/${salonId}/services`);
      addDocumentNonBlocking(servicesRef, serviceData);
      
      setAddedServiceName(data.name);
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
          <h3 className="text-base font-bold text-slate-900">Service Added!</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            &apos;{addedServiceName}&apos; has been added to your service catalog.
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
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
                    <Input placeholder="e.g., Keratin Smooth Treatment" className="h-8 pl-8 rounded-xl text-xs bg-slate-50 border-slate-200 text-slate-900 font-semibold focus:border-purple-600" {...field} />
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
                    <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 border-slate-200 text-slate-900 font-semibold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl text-xs bg-white text-slate-900 font-medium">
                    {SERVICE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs text-slate-900 font-medium">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <Input type="number" placeholder="950" className="h-8 pl-8 rounded-xl text-xs bg-slate-50 border-slate-200 text-slate-900 font-bold focus:border-purple-600" {...field} />
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
            'Add Service'
          )}
        </Button>
      </form>
    </Form>
  );
}
