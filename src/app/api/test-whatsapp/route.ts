import { NextResponse } from 'next/server';
// @ts-ignore
import { sendWhatsAppMessage } from '../../../../backend/services/twilioService.js';

/**
 * Test API route to send a sample Twilio WhatsApp message.
 * POST /api/test-whatsapp
 * Body: { "phone": "9876543210" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Send test WhatsApp message
    const result = await sendWhatsAppMessage(phone, "Hi! This is a test WhatsApp message from Salon Flow.");

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
    console.error('Error in test-whatsapp route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
