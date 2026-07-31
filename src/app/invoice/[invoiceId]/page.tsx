import InvoiceClient from './InvoiceClient';

export function generateStaticParams() {
  return [{ invoiceId: 'placeholder' }];
}

export default function InvoicePage() {
  return <InvoiceClient />;
}
