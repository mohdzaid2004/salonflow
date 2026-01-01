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
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const themeColors = [
  { name: 'Default', value: '275 100% 25.3%', className: 'bg-[hsl(275,100%,25.3%)]' },
  { name: 'Stone', value: '240 5.9% 10%', className: 'bg-stone-900' },
  { name: 'Rose', value: '346.8 77.2% 49.8%', className: 'bg-rose-600' },
  { name: 'Teal', value: '162 72% 46%', className: 'bg-teal-500' },
  { name: 'Indigo', value: '221.2 83.2% 53.3%', className: 'bg-indigo-600' },
];

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

  const handleToggleAppointments = (enabled: boolean) => {
    if (!salonDocRef) return;
    startTransition(async () => {
      try {
        await updateDoc(salonDocRef, { appointmentsEnabled: enabled });
        toast({
          title: 'Settings updated',
          description: `Appointments have been ${enabled ? 'enabled' : 'disabled'}.`,
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

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>
            Turn features on or off for your salon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Switch
                id="appointments-toggle"
                checked={salon?.appointmentsEnabled}
                onCheckedChange={handleToggleAppointments}
                disabled={isPending}
              />
              <Label htmlFor="appointments-toggle">
                Enable Appointment Management
              </Label>
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
       <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            This section is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Salon details, subscription management, and other settings will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
