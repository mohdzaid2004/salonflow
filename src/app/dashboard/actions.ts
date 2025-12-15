'use server';

import { sendWhatsAppBookingConfirmation, type SendWhatsAppBookingConfirmationInput } from '@/ai/flows/whatsapp-booking-confirmation';

export async function sendBookingConfirmationAction(input: SendWhatsAppBookingConfirmationInput) {
  try {
    const result = await sendWhatsAppBookingConfirmation(input);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error in sendBookingConfirmationAction:', error);
    // This is a simplified error handling. In a real app, you'd want to
    // log this error to a monitoring service and return a more user-friendly message.
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while sending the confirmation.' };
  }
}
