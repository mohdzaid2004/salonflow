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
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { InventoryProduct } from '@/lib/data';

const editProductFormSchema = z.object({
  name: z.string().min(2, 'Product name is required.'),
  brand: z.string().optional(),
  stockQuantity: z.coerce.number().min(0, 'Stock must be 0 or more.'),
  lowStockThreshold: z.coerce.number().min(0, 'Threshold must be 0 or more.'),
  unitPrice: z.coerce.number().min(0, 'Price must be a positive number.'),
});

type EditProductFormValues = z.infer<typeof editProductFormSchema>;

export function EditProductForm({
  product,
  setOpen,
}: {
  product: InventoryProduct;
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const salonId = user?.uid;

  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductFormSchema),
    defaultValues: {
      name: product.name,
      brand: product.brand || '',
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      unitPrice: product.unitPrice,
    },
  });

  function onSubmit(data: EditProductFormValues) {
    startTransition(() => {
      if (!salonId || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User or database not available.',
        });
        return;
      }

      const productRef = doc(firestore, `salons/${salonId}/inventory`, product.id);
      updateDocumentNonBlocking(productRef, data);

      setIsSuccess(true);
    });
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h3 className="text-xl font-semibold">Product Updated!</h3>
        <p className="text-center text-muted-foreground">
          The details for '{form.getValues('name')}' have been saved.
        </p>
        <Button onClick={() => setOpen(false)} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Moisture Shampoo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., L'Oréal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Low Stock Alert</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="unitPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retail Price (INR)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
