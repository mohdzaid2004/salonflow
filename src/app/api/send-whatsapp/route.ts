import { NextResponse } from 'next/server';
// @ts-ignore
import { sendWhatsAppMessage } from '../../../../backend/services/twilioService.js';

function sanitizeWhatsAppMessage(text: string): string {
  if (!text) return '';

  // 1. Remove base64 data URLs: data:application/pdf;base64,... or data:...;base64,...
  let cleaned = text.replace(/data:application\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '[Document Attached]');
  cleaned = cleaned.replace(/data:[a-zA-Z0-9+.-]+\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '');

  // 2. Remove raw Base64 PDF signatures
  cleaned = cleaned.replace(/JVBERi0[A-Za-z0-9+/=]{20,}/g, '');
  cleaned = cleaned.replace(/%PDF-[0-9.]{1,5}[A-Za-z0-9+/=\s]{20,}/g, '');

  // 3. Remove leftover "base64," blocks if any
  cleaned = cleaned.replace(/base64,[A-Za-z0-9+/=]{30,}/g, '');

  return cleaned.trim();
}

/**
 * API route to send a general WhatsApp message with optional PDF/media attachment.
 * POST /api/send-whatsapp
 * Body: { "phone": "9876543210", "message": "...", "mediaUrl": "https://..." }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, message, mediaUrl } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Strictly sanitize message text to guarantee zero Base64 or binary data in customer text
    const sanitizedMessage = sanitizeWhatsAppMessage(message);

    // Validate mediaUrl: must be a valid public HTTPS URL (never data: or blob:)
    let validMediaUrl: string | null = null;
    if (typeof mediaUrl === 'string' && mediaUrl.startsWith('https://')) {
      validMediaUrl = mediaUrl;
    }

    console.log(`[Send-WhatsApp Route] Sending WhatsApp to: ${phone}, media: ${validMediaUrl || 'none'}`);

    // Call twilio service helper to send the message
    const result = await sendWhatsAppMessage(phone, sanitizedMessage, validMediaUrl || undefined);

    if (result.success) {
      return NextResponse.json({ success: true, messageSid: result.messageSid });
    } else {
      if (result.error === 'Twilio credentials not configured') {
        return new NextResponse("Twilio credentials not configured", { status: 500 });
      }
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in send-whatsapp route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
