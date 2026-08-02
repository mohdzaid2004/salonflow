import { getTwilioClient, getTwilioConfig } from '../whatsapp/client';
import { formatWhatsAppNumber } from '../whatsapp/utils';

export interface WhatsAppNotificationPayload {
  salonId: string;
  salonName: string;
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  grandTotal: number;
  pointsEarned: number;
  pdfUrl: string;
  feedbackUrl: string;
}

/**
 * Sends a structured, professional WhatsApp confirmation message with invoice PDF attachment.
 */
export async function sendWhatsAppInvoiceNotification(payload: WhatsAppNotificationPayload): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { salonId, salonName, customerPhone, customerName, invoiceNumber, grandTotal, pointsEarned, pdfUrl, feedbackUrl } = payload;

  const formattedTo = formatWhatsAppNumber(customerPhone);
  if (!formattedTo) {
    console.error(`[Invoice Notifier] Invalid phone format: ${customerPhone}`);
    return { success: false, error: 'Invalid phone number format.' };
  }

  // Load salon specific Twilio configurations
  const config = await getTwilioConfig(salonId);
  const client = await getTwilioClient(salonId);

  if (!client || !config.accountSid || !config.authToken) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  // Format sender phone number
  let formattedFrom = config.whatsappNumber.trim();
  if (!formattedFrom.toLowerCase().startsWith('whatsapp:')) {
    formattedFrom = `whatsapp:${formattedFrom.startsWith('+') ? '' : '+'}${formattedFrom}`;
  }

  // Build the message body
  const messageBody = 
    `💇 Thank you for visiting *${salonName}*!\n\n` +
    `📄 *Invoice Number:* ${invoiceNumber}\n` +
    `💰 *Amount Paid:* ₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(grandTotal)}\n` +
    `🪙 *Loyalty Points Earned:* ${pointsEarned} pts\n\n` +
    `Your PDF invoice has been attached to this message.\n\n` +
    `Please rate your experience with us by visiting:\n` +
    `${feedbackUrl}`;

  try {
    console.log(`[Invoice Notifier] Dispatching Twilio WhatsApp message to ${formattedTo} with PDF attachment...`);
    const response = await client.messages.create({
      body: messageBody,
      to: formattedTo,
      from: formattedFrom,
      mediaUrl: [pdfUrl] // Attach PDF invoice URL
    });

    console.log(`[Invoice Notifier] WhatsApp notification dispatched successfully. SID: ${response.sid}`);
    return { success: true, messageSid: response.sid };
  } catch (error: any) {
    console.error('[Invoice Notifier] Failed to send Twilio WhatsApp notification:', error);
    return { success: false, error: error.message || 'Twilio send failed' };
  }
}
