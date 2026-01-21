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
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useUser,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection } from 'firebase/firestore';

const addServiceFormSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters.'),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
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
      price: 0,
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
      };

      const servicesRef = collection(firestore, `salons/${salonId}/services`);
      addDocumentNonBlocking(servicesRef, serviceData);
      
      setAddedServiceName(data.name);
      setIsSuccess(true);
    });
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h3 className="text-xl font-semibold">Service Added!</h3>
        <p className="text-center text-muted-foreground">
          '{addedServiceName}' has been added to your services.
        </p>
        <Button onClick={() => setOpen(false)} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Haircut" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (INR)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 250" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Service
        </Button>
      </form>
    </Form>
  );
}
