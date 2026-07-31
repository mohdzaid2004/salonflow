import { NextResponse } from 'next/server';
// @ts-ignore
import { sendWhatsAppMessage } from '../../../../backend/services/twilioService.js';

/**
 * API route to send a general WhatsApp message.
 * POST /api/send-whatsapp
 * Body: { "phone": "9876543210", "message": "..." }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Call twilio service helper to send the message
    const result = await sendWhatsAppMessage(phone, message);

    if (result.success) {
      return NextResponse.json({ success: true, messageSid: result.messageSid });
    } else {
      // If Twilio credentials are missing, return 500 "Twilio credentials not configured"
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
