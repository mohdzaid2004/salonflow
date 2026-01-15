import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function BillingPage() {
  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <PageHeader title="Billing" />
      <Card>
        <CardHeader>
          <CardTitle>Billing & Invoices</CardTitle>
          <CardDescription>
            This section is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Payment history, invoice generation, and GST reports will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
