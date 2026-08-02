import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Retrieve Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const senderWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_SENDER_NUMBER || 'whatsapp:+14155238886';

// Initialize the Twilio client if credentials are present
let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

/**
 * Validates and formats phone numbers for Twilio WhatsApp API.
 * Converts 10-digit Indian numbers (e.g. 9876543210) into E.164 with whatsapp: prefix (e.g. whatsapp:+919876543210).
 * Handles numbers already containing a plus sign or country code.
 * 
 * @param {string} phoneNumber - The raw phone number input
 * @returns {string|null} The formatted WhatsApp URI (whatsapp:+E164) or null if invalid
 */
export function formatWhatsAppNumber(phoneNumber) {
  if (!phoneNumber) return null;

  // Trim and convert to string
  let str = phoneNumber.toString().trim();

  // Strip 'whatsapp:' prefix if already present for cleaner processing
  if (str.toLowerCase().startsWith('whatsapp:')) {
    str = str.substring(9);
  }

  // Remove all non-numeric characters except the leading '+'
  const hasPlus = str.startsWith('+');
  const digits = str.replace(/\D/g, '');

  let e164Digits = digits;

  // Formatting logic:
  if (hasPlus) {
    // If it started with '+', keep the digits as is
    e164Digits = digits;
  } else if (digits.length === 10) {
    // If it's a 10-digit number, assume it is an Indian mobile number and prepend '91'
    e164Digits = '91' + digits;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // If it's 12 digits and starts with '91', it already has the Indian country code
    e164Digits = digits;
  } else if (digits.length >= 10 && digits.length <= 15) {
    // Other valid E.164 digit lengths without country prefix
    e164Digits = digits;
  } else {
    // Reject anything else as invalid
    return null;
  }

  // E.164 phone numbers must be between 10 and 15 digits (including country code)
  if (e164Digits.length < 10 || e164Digits.length > 15) {
    return null;
  }

  return `whatsapp:+${e164Digits}`;
}

/**
 * Sends a WhatsApp message using the Twilio WhatsApp API, supporting optional media attachments.
 * 
 * @param {string} phoneNumber - The destination phone number (e.g., 9876543210)
 * @param {string} message - The text content of the message
 * @param {string} [mediaUrl] - Optional URL to a media file (like a PDF) to attach
 * @returns {Promise<{success: boolean, messageSid?: string, error?: string}>} Responding status object
 */
export async function sendWhatsAppMessage(phoneNumber, message, mediaUrl = null) {
  // 1. Validate the inputs
  if (!phoneNumber || !message) {
    return { success: false, error: 'Phone number and message body are required.' };
  }

  // 2. Validate and format the destination number
  const formattedTo = formatWhatsAppNumber(phoneNumber);
  if (!formattedTo) {
    console.error(`[TwilioService] Invalid phone number provided: "${phoneNumber}"`);
    return { success: false, error: 'Invalid phone number format.' };
  }

  // 3. Verify Twilio configuration
  if (!accountSid || !authToken || !client) {
    console.error('[TwilioService] Twilio credentials are not configured in environment variables.');
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    // Format the sender number (must have 'whatsapp:' prefix)
    let formattedFrom = senderWhatsAppNumber.trim();
    if (!formattedFrom.toLowerCase().startsWith('whatsapp:')) {
      formattedFrom = `whatsapp:${formattedFrom.startsWith('+') ? '' : '+'}${formattedFrom}`;
    }

    console.log(`[TwilioService] Sending WhatsApp message to ${formattedTo} from ${formattedFrom} with media: ${mediaUrl || 'none'}...`);

    const messageParams = {
      body: message,
      to: formattedTo,
      from: formattedFrom,
    };

    if (mediaUrl) {
      messageParams.mediaUrl = [mediaUrl];
    }

    // 4. Send the message via Twilio SDK
    const response = await client.messages.create(messageParams);

    // 5. Log the Message SID
    console.log(`[TwilioService] Message sent successfully. SID: ${response.sid}`);

    return { success: true, messageSid: response.sid };
  } catch (error) {
    console.error('[TwilioService] Failed to send WhatsApp message via Twilio API:', error);
    return { success: false, error: error.message || 'Twilio API call failed' };
  }
}
