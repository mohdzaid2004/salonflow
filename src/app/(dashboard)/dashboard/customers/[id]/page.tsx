import CustomerDetailClient from './CustomerDetailClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function CustomerDetailPage() {
  return <CustomerDetailClient />;
}
