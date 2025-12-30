'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DashboardPage() {

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
          <CardDescription>
            This is your starting point. You can now begin to build out your features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>The login flow is now isolated and working. All previous sign-up and data-seeding logic has been removed to create a stable foundation.</p>
        </CardContent>
      </Card>
    </div>
  );
}
