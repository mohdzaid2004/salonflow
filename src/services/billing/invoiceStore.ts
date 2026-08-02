import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { format } from 'date-fns';

function getDbInstance() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

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
  lastPrinted?: Timestamp;
}

/**
 * Generates a unique, sequential invoice number format: INV-YYYYMMDD-XXXXXX
 * Queries today's invoices count in Firestore to ensure correct sequence.
 */
export async function generateSequentialInvoiceNumber(salonId: string): Promise<string> {
  const db = getDbInstance();
  const todayPrefix = `INV-${format(new Date(), 'yyyyMMdd')}`;
  
  try {
    const invoicesRef = collection(db, `salons/${salonId}/invoices`);
    // Query invoices created today
    const q = query(
      invoicesRef,
      where('invoiceNumber', '>=', todayPrefix),
      where('invoiceNumber', '<=', todayPrefix + '\uf8ff')
    );
    const snap = await getDocs(q);
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
  const db = getDbInstance();
  const invoiceDocRef = doc(db, `salons/${salonId}/invoices`, metadata.id);

  console.log(`[Invoice Store] Saving metadata for invoice ${metadata.invoiceNumber}...`);

  await setDoc(invoiceDocRef, {
    ...metadata,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}
