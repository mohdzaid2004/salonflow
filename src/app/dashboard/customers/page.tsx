import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function CustomersPage() {
  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <PageHeader title="Customers" />
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>
            This section is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Customer list and CRM features will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
