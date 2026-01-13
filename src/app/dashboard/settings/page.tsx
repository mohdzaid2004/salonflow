'use client';

import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Salon } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';

const themeColors = [
  { name: 'Default', value: '275 100% 25.3%', className: 'bg-[hsl(275,100%,25.3%)]' },
  { name: 'Stone', value: '240 5.9% 10%', className: 'bg-stone-900' },
  { name: 'Rose', value: '346.8 77.2% 49.8%', className: 'bg-rose-600' },
  { name: 'Teal', value: '162 72% 46%', className: 'bg-teal-500' },
  { name: 'Indigo', value: '221.2 83.2% 53.3%', className: 'bg-indigo-600' },
];

const loyaltySchema = z.object({
  loyaltyPointsRatio: z.coerce.number().min(0, 'Percentage must be 0 or more.'),
});

type LoyaltyFormValues = z.infer<typeof loyaltySchema>;

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const salonId = user?.uid;
  const salonDocRef = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: salon, isLoading } = useDoc<Salon>(salonDocRef);

  const loyaltyForm = useForm<LoyaltyFormValues>({
    resolver: zodResolver(loyaltySchema),
    values: {
      loyaltyPointsRatio: salon?.loyaltyPointsRatio || 5, // Default to 5%
    }
  });

  const handleToggleFeature = (feature: 'appointmentsEnabled' | 'loyaltyProgramEnabled', enabled: boolean) => {
    if (!salonDocRef) return;
    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, { [feature]: enabled });
        const featureName = feature === 'appointmentsEnabled' ? 'Appointments' : 'Loyalty Program';
        toast({
          title: 'Settings updated',
          description: `${featureName} have been ${enabled ? 'enabled' : 'disabled'}.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update settings.',
        });
      }
    });
  };

  const handleThemeChange = (colorValue: string) => {
    if (!salonDocRef) return;
    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, { themeColor: colorValue });
        toast({
          title: 'Theme updated',
          description: 'Your primary color has been changed.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update theme.',
        });
      }
    });
  }
  
  const handleLoyaltySubmit = (data: LoyaltyFormValues) => {
     if (!salonDocRef) return;
    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, { loyaltyPointsRatio: data.loyaltyPointsRatio });
        toast({
          title: 'Loyalty settings updated',
          description: 'Your loyalty points percentage has been saved.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update loyalty settings.',
        });
      }
    });
  }

  return (
    <div className="grid flex-1 items-start gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>
            Turn features on or off for your salon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-4 w-48" />
              </div>
               <Separator />
               <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="appointments-toggle"
                  checked={salon?.appointmentsEnabled}
                  onCheckedChange={(checked) => handleToggleFeature('appointmentsEnabled', checked)}
                  disabled={isPending}
                />
                <Label htmlFor="appointments-toggle">
                  Enable Appointment Management
                </Label>
              </div>
              <Separator />
               <div className="flex items-center space-x-2">
                <Switch
                  id="loyalty-toggle"
                  checked={salon?.loyaltyProgramEnabled}
                  onCheckedChange={(checked) => handleToggleFeature('loyaltyProgramEnabled', checked)}
                  disabled={isPending}
                />
                <Label htmlFor="loyalty-toggle">
                  Enable Loyalty Program
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <Skeleton className="h-24 w-full" />
          ) : (
            <div>
              <Label className='mb-2 block'>Primary Color</Label>
              <RadioGroup
                defaultValue={salon?.themeColor || themeColors[0].value}
                onValueChange={handleThemeChange}
                className="flex flex-wrap gap-4"
                disabled={isPending}
              >
                {themeColors.map((color) => (
                  <div key={color.name} className="flex items-center space-x-2">
                    <RadioGroupItem value={color.value} id={`color-${color.name}`} className='sr-only' />
                    <Label htmlFor={`color-${color.name}`} className='flex flex-col items-center gap-2 cursor-pointer'>
                      <div className={cn("h-8 w-8 rounded-full border-2", salon?.themeColor === color.value ? 'border-ring' : 'border-transparent')}>
                        <div className={cn("h-full w-full rounded-full", color.className)} />
                      </div>
                      <span className='text-xs'>{color.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>
      
      {salon?.loyaltyProgramEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Loyalty Program</CardTitle>
            <CardDescription>
              Configure how customers earn loyalty points.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <form onSubmit={loyaltyForm.handleSubmit(handleLoyaltySubmit)}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor="loyalty-ratio">Points Award Percentage (%)</Label>
                    <Controller
                      name="loyaltyPointsRatio"
                      control={loyaltyForm.control}
                      render={({ field }) => (
                        <Input
                          id="loyalty-ratio"
                          type="number"
                          {...field}
                          className="mt-2"
                        />
                      )}
                    />
                    {loyaltyForm.formState.errors.loyaltyPointsRatio && (
                      <p className="mt-1 text-sm text-destructive">{loyaltyForm.formState.errors.loyaltyPointsRatio.message}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      The percentage of the final bill awarded as points. e.g., a value of 10 means 10% of the bill is converted to points.
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={isPending} className='w-full sm:w-auto'>Save</Button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
