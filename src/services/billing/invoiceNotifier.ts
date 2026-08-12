import { getTwilioClient, getTwilioConfig, formatWhatsAppNumber } from './config';
import { format } from 'date-fns';
import type { Service } from '@/lib/data';

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
  paymentMethod: string;
  currentPoints: number;
  services: Service[];
  salonAddress: string;
  salonPhone: string;
}

/**
 * Sends a structured, professional WhatsApp confirmation message with invoice PDF attachment.
 */
export async function sendWhatsAppInvoiceNotification(payload: WhatsAppNotificationPayload): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { salonId, salonName, customerPhone, customerName, invoiceNumber, grandTotal, pointsEarned, pdfUrl, feedbackUrl, paymentMethod, currentPoints, services, salonAddress, salonPhone } = payload;

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

  const formattedAmount = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(grandTotal);
  const paymentDate = format(new Date(), 'dd-MM-yyyy');
  const paymentTime = format(new Date(), 'hh:mm a');

  const serviceListStr = (services && services.length > 0)
    ? services.map(s => `- ${s.name}: ₹${s.price}`).join('\n')
    : '- Service(s)';

  // Build the user-defined structured message template
  const messageBody = 
    `💇 Thank you for visiting ${salonName}!\n\n` +
    `Hi ${customerName},\n\n` +
    `Your payment has been received successfully.\n\n` +
    `🧾 Invoice: ${invoiceNumber}\n` +
    `💰 Amount Paid: ₹${formattedAmount}\n` +
    `💳 Payment Method: ${paymentMethod}\n\n` +
    `📎 Invoice:\n` +
    `${pdfUrl}\n\n` +
    `⭐ We'd love your feedback:\n` +
    `${feedbackUrl}\n\n` +
    `Thank you for choosing ${salonName}!`;

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
