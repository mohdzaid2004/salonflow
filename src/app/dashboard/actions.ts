'use server';

export async function sendBookingConfirmationAction(input: any) {
  // This is a placeholder for any server-side logic you might want to run.
  // Since the AI feature is removed, we'll just simulate a successful booking.
  console.log('Simulating booking for:', input);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  return { success: true, messageId: `mock_${Date.now()}` };
}
