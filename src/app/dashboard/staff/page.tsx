'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useHeaderActions } from '@/components/dashboard/header-actions-context';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';


export default function StaffPage() {
  const { setActions } = useHeaderActions();

   useEffect(() => {
    setActions(
      <Button onClick={() => alert('Add new staff dialog would open here.')}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Staff
      </Button>
    );
    return () => setActions(null);
  }, [setActions]);

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>
            This section is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Staff list and management features will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
