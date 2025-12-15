import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <PageHeader title="Settings" />
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
