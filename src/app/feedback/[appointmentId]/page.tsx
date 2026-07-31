import FeedbackClient from './FeedbackClient';

export function generateStaticParams() {
  return [{ appointmentId: 'placeholder' }];
}

export default function FeedbackPage() {
  return <FeedbackClient />;
}
