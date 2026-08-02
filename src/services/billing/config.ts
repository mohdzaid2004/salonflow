import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import twilio from 'twilio';

// Initialize modular Firebase Admin SDK
export function getAdminApp() {
  if (getApps().length === 0) {
    return initializeApp({
      projectId: 'salonindia-74cbb',
      storageBucket: 'salonindia-74cbb.firebasestorage.app'
    });
  }
  return getApp();
}

export function getAdminDb() {
  getAdminApp();
  return getFirestore();
}

export function getAdminStorageBucket() {
  getAdminApp();
  return getStorage().bucket('salonindia-74cbb.firebasestorage.app');
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
  automatedWhatsappEnabled: boolean;
}

/**
 * Fetches Twilio configurations for a salon.
 * Falls back to environment variables if dashboard settings are missing.
 */
export async function getTwilioConfig(salonId: string): Promise<TwilioConfig> {
  const db = getAdminDb();
  const salonRef = db.doc(`salons/${salonId}`);
  
  let accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  let authToken = process.env.TWILIO_AUTH_TOKEN || '';
  let whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  let automatedWhatsappEnabled = false;

  try {
    const snap = await salonRef.get();
    if (snap.exists) {
      const data = snap.data();
      if (data) {
        if (data.twilioAccountSid) accountSid = data.twilioAccountSid;
        if (data.twilioAuthToken) authToken = data.twilioAuthToken;
        if (data.twilioWhatsappNumber) whatsappNumber = data.twilioWhatsappNumber;
        if (data.automatedWhatsappEnabled !== undefined) {
          automatedWhatsappEnabled = data.automatedWhatsappEnabled;
        }
      }
    }
  } catch (error) {
    console.error(`[Billing Config] Error loading Twilio config for salon ${salonId}:`, error);
  }

  return {
    accountSid,
    authToken,
    whatsappNumber,
    automatedWhatsappEnabled
  };
}

/**
 * Returns an initialized Twilio client for a salon.
 */
export async function getTwilioClient(salonId: string): Promise<twilio.Twilio | null> {
  const config = await getTwilioConfig(salonId);
  if (!config.accountSid || !config.authToken) {
    console.error(`[Billing Config] Missing credentials for salon ${salonId}`);
    return null;
  }
  return twilio(config.accountSid, config.authToken);
}

/**
 * Formats a phone number to E.164 with whatsapp: prefix.
 */
export function formatWhatsAppNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  let str = phoneNumber.toString().trim();
  
  if (str.toLowerCase().startsWith('whatsapp:')) {
    str = str.substring(9);
  }

  const hasPlus = str.startsWith('+');
  const digits = str.replace(/\D/g, '');

  let e164Digits = digits;

  if (hasPlus) {
    e164Digits = digits;
  } else if (digits.length === 10) {
    e164Digits = '91' + digits; // Default to India country code
  } else if (digits.length === 12 && digits.startsWith('91')) {
    e164Digits = digits;
  } else if (digits.length >= 10 && digits.length <= 15) {
    e164Digits = digits;
  } else {
    return null;
  }

  if (e164Digits.length < 10 || e164Digits.length > 15) {
    return null;
  }

  return `whatsapp:+${e164Digits}`;
}
