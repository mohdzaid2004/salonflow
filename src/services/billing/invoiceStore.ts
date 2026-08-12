import { getAdminDb } from './config';
import { format } from 'date-fns';
import { FieldValue } from 'firebase-admin/firestore';

export interface InvoiceMetadata {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  appointmentId: string;
  staffId: string;
  staffName: string;
  subtotal: number;
  gstAmount: number;
  finalAmount: number;
  paymentMethod: string;
  invoiceUrl: string;
  storagePath: string;
  whatsappStatus: 'pending' | 'sent' | 'failed';
  printCount: number;
  lastPrinted?: any;
  feedbackSubmitted?: boolean;
  feedbackRating?: number | null;
  feedbackSubmittedAt?: any;
}

/**
 * Generates a unique, sequential invoice number format: INV-YYYYMMDD-XXXXXX
 * Queries today's invoices count in Firestore using admin SDK to ensure correct sequence.
 */
export async function generateSequentialInvoiceNumber(salonId: string): Promise<string> {
  const db = getAdminDb();
  const todayPrefix = `INV-${format(new Date(), 'yyyyMMdd')}`;
  
  try {
    const invoicesRef = db.collection(`salons/${salonId}/invoices`);
    // Query invoices created today
    const snap = await invoicesRef
      .where('invoiceNumber', '>=', todayPrefix)
      .where('invoiceNumber', '<=', todayPrefix + '\uf8ff')
      .get();
    const nextNum = snap.size + 1;
    const paddedNum = String(nextNum).padStart(6, '0');
    return `${todayPrefix}-${paddedNum}`;
  } catch (error) {
    console.error('[Invoice Store] Error generating invoice number, using random fallback:', error);
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    return `${todayPrefix}-${randomHex}`;
  }
}

/**
 * Saves invoice metadata to Firestore.
 */
export async function saveInvoiceMetadata(
  salonId: string,
  metadata: Omit<InvoiceMetadata, 'createdAt' | 'updatedAt'>
): Promise<void> {
  const db = getAdminDb();
  const invoiceDocRef = db.doc(`salons/${salonId}/invoices/${metadata.id}`);

  console.log(`[Invoice Store] Saving metadata for invoice ${metadata.invoiceNumber}...`);

  await invoiceDocRef.set({
    ...metadata,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
}
