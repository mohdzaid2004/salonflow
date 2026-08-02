import { getApps, initializeApp, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

function getStorageInstance() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getStorage(app);
}

/**
 * Uploads an invoice PDF buffer to Firebase Storage and returns its secure download URL.
 * Storage path: salons/{salonId}/invoices/{invoiceNumber}.pdf
 */
export async function uploadInvoicePDF(
  salonId: string,
  invoiceNumber: string,
  pdfBuffer: Buffer
): Promise<{ downloadUrl: string; storagePath: string }> {
  try {
    const storage = getStorageInstance();
    const storagePath = `salons/${salonId}/invoices/${invoiceNumber}.pdf`;
    const fileRef = ref(storage, storagePath);

    // Upload the raw buffer bytes
    console.log(`[Invoice Uploader] Uploading PDF to Firebase Storage path: ${storagePath}...`);
    const metadata = {
      contentType: 'application/pdf',
    };
    
    await uploadBytes(fileRef, pdfBuffer, metadata);
    const downloadUrl = await getDownloadURL(fileRef);

    console.log(`[Invoice Uploader] Upload complete. Secure URL: ${downloadUrl}`);
    return { downloadUrl, storagePath };
  } catch (error) {
    console.error('[Invoice Uploader] Firebase Storage upload error:', error);
    throw new Error('Failed to upload invoice to Cloud Storage');
  }
}
