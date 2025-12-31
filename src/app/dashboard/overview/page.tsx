'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function OverviewPage() {
  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
          <CardDescription>
            This is your starting point. You now have a clean login and sign-up flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>You can now begin to build out your features on this stable foundation.</p>
        </CardContent>
      </Card>
    </div>
  );
}
