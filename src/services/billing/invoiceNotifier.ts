import { getTwilioClient, getTwilioConfig, formatWhatsAppNumber } from './config';
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

function sanitizeMessage(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/data:application\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '');
  cleaned = cleaned.replace(/data:[a-zA-Z0-9+.-]+\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '');
  cleaned = cleaned.replace(/JVBERi0[A-Za-z0-9+/=]{20,}/g, '');
  cleaned = cleaned.replace(/%PDF-[0-9.]{1,5}[A-Za-z0-9+/=\s]{20,}/g, '');
  return cleaned.trim();
}

/**
 * Sends a structured, professional WhatsApp confirmation message with invoice PDF document attachment.
 */
export async function sendWhatsAppInvoiceNotification(payload: WhatsAppNotificationPayload): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { 
    salonId, 
    salonName, 
    customerPhone, 
    customerName, 
    invoiceNumber, 
    grandTotal, 
    pointsEarned, 
    pdfUrl, 
    feedbackUrl, 
    paymentMethod, 
    currentPoints, 
    services, 
    salonAddress, 
    salonPhone 
  } = payload;

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

  const formattedAmount = `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(grandTotal)}`;
  const serviceName = (services && services.length > 0) ? services.map(s => s.name).join(', ') : 'Salon Service';

  // Build the clean customer-facing message without any Base64 strings or raw binary data
  const rawMessage = `💜 Thank You for Visiting ${salonName}!

Hi ${customerName} 👋

We hope you enjoyed your ${serviceName} experience with us! ✨

Your payment of ${formattedAmount} has been successfully received. 🎉

🧾 Invoice: ${invoiceNumber}
💳 Payment: ${paymentMethod}
💰 Amount Paid: ${formattedAmount}

🎁 Loyalty Points Earned: ${pointsEarned}
⭐ Loyalty Balance: ${currentPoints} Points

📎 Your invoice is attached to this WhatsApp message.

⭐ How was your experience?

We'd love to hear your feedback.
It only takes a few seconds. ❤️

👉 Rate Your Experience:
${feedbackUrl}

Your feedback helps us improve and serve you better. 💫

Thank you for choosing ${salonName}! ❤️

We look forward to welcoming you again.

📍 ${salonAddress || 'India'}
📞 ${salonPhone || ''}`;

  const messageBody = sanitizeMessage(rawMessage);

  try {
    const messageParams: any = {
      body: messageBody,
      to: formattedTo,
      from: formattedFrom,
    };

    // Attach PDF only if it's a valid public HTTPS URL
    if (pdfUrl && pdfUrl.startsWith('https://')) {
      messageParams.mediaUrl = [pdfUrl];
      console.log(`[Invoice Notifier] Attaching HTTPS PDF to Twilio message: ${pdfUrl}`);
    }

    console.log(`[Invoice Notifier] Dispatching Twilio WhatsApp message to ${formattedTo}...`);
    const response = await client.messages.create(messageParams);

    console.log(`[Invoice Notifier] WhatsApp notification dispatched successfully. SID: ${response.sid}`);
    return { success: true, messageSid: response.sid };
  } catch (error: any) {
    console.error('[Invoice Notifier] Failed to send Twilio WhatsApp notification:', error);
    return { success: false, error: error.message || 'Twilio send failed' };
  }
}
