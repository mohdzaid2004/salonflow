import StaffDetailClient from './StaffDetailClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function StaffDetailPage() {
  return <StaffDetailClient />;
}
