import { getAdminStorageBucket } from './config';

/**
 * Uploads an invoice PDF buffer to Firebase Storage using Admin SDK and returns its public URL.
 * Storage path: salons/{salonId}/invoices/{invoiceNumber}.pdf
 */
export async function uploadInvoicePDF(
  salonId: string,
  invoiceNumber: string,
  pdfBuffer: Buffer
): Promise<{ downloadUrl: string; storagePath: string }> {
  try {
    const bucket = getAdminStorageBucket();
    const storagePath = `salons/${salonId}/invoices/${invoiceNumber}.pdf`;
    const file = bucket.file(storagePath);

    console.log(`[Invoice Uploader] Uploading PDF via Admin SDK to: ${storagePath}...`);
    
    // Upload the raw buffer bytes
    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
      },
    });

    // Make file public to allow Twilio and customer download access
    try {
      await file.makePublic();
    } catch (pubErr) {
      console.warn('[Invoice Uploader] Failed to make file public, trying fallback...', pubErr);
    }

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    console.log(`[Invoice Uploader] Upload complete. URL: ${downloadUrl}`);
    return { downloadUrl, storagePath };
  } catch (error) {
    console.error('[Invoice Uploader] Firebase Admin Storage upload error:', error);
    throw new Error('Failed to upload invoice to Cloud Storage');
  }
}
