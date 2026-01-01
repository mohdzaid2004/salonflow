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
