import { NextResponse } from 'next/server';
import { getAdminDb } from '@/services/billing/config';
import { generateSequentialInvoiceNumber, saveInvoiceMetadata } from '@/services/billing/invoiceStore';
import { generateInvoicePDF } from '@/services/billing/invoiceGenerator';
import { uploadInvoicePDF } from '@/services/billing/invoiceUploader';
import { sendWhatsAppInvoiceNotification } from '@/services/billing/invoiceNotifier';
import { FieldPath } from 'firebase-admin/firestore';
import type { Appointment, Salon, Customer, Staff, Service } from '@/lib/data';

export async function GET() {
  const db = getAdminDb();
  const salonId = 'n0U824dE1mPzDqgA8Z';
  const appointmentId = 'T8kU94dE1mPzDqgA2Y';
  
  let exists = false;
  let docData = null;
  let errorMsg = null;
  
  try {
    const apptRef = db.doc(`salons/${salonId}/appointments/${appointmentId}`);
    const apptSnap = await apptRef.get();
    exists = apptSnap.exists;
    if (exists) {
      docData = apptSnap.data();
    }
  } catch (err: any) {
    errorMsg = err.message;
  }

  return NextResponse.json({ 
    status: 'active', 
    message: 'SalonFlow Invoicing API is operational.',
    projectId: db.projectId || 'unknown',
    docPath: `salons/${salonId}/appointments/${appointmentId}`,
    docExists: exists,
    docData,
    error: errorMsg
  });
}

/**
 * Enterprise Invoicing Pipeline API.
 * POST /api/billing/invoice
 * Body: { "salonId": "...", "appointmentId": "...", "sendWhatsApp": true }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { salonId, appointmentId, sendWhatsApp } = body;

    if (!salonId || !appointmentId) {
      return NextResponse.json(
        { success: false, error: 'salonId and appointmentId are required.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // 1. Fetch Appointment data using Admin SDK
    const apptRef = db.doc(`salons/${salonId}/appointments/${appointmentId}`);
    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) {
      return NextResponse.json({ success: false, error: 'Appointment not found.' }, { status: 404 });
    }
    const appointment = { id: apptSnap.id, ...apptSnap.data() } as Appointment;

    // 2. Check if invoice already exists to prevent duplicate generation
    const existingInvoiceRef = db.doc(`salons/${salonId}/invoices/${appointmentId}`);
    const existingSnap = await existingInvoiceRef.get();
    if (existingSnap.exists) {
      const data = existingSnap.data();
      return NextResponse.json({ 
        success: true, 
        message: 'Invoice already exists.', 
        invoiceNumber: data?.invoiceNumber,
        invoiceUrl: data?.invoiceUrl 
      });
    }

    // 3. Fetch related Salon, Customer, Staff details using Admin SDK
    const salonRef = db.doc(`salons/${salonId}`);
    const customerRef = db.doc(`salons/${salonId}/customers/${appointment.customerId}`);
    const staffRef = db.doc(`salons/${salonId}/staff/${appointment.staffId}`);

    const [salonSnap, customerSnap, staffSnap] = await Promise.all([
      salonRef.get(),
      customerRef.get(),
      staffRef.get()
    ]);

    if (!salonSnap.exists || !customerSnap.exists || !staffSnap.exists) {
      return NextResponse.json({ success: false, error: 'Salon, customer, or staff data missing.' }, { status: 400 });
    }

    const salon = { id: salonSnap.id, ...salonSnap.data() } as Salon;
    const customer = { id: customerSnap.id, ...customerSnap.data() } as Customer;
    const staff = { id: staffSnap.id, ...staffSnap.data() } as Staff;

    // 4. Fetch Services detailed list using Admin SDK
    let services: Service[] = [];
    if (appointment.serviceIds && appointment.serviceIds.length > 0) {
      const servicesRef = db.collection(`salons/${salonId}/services`);
      const servicesSnap = await servicesRef.where(FieldPath.documentId(), 'in', appointment.serviceIds).get();
      services = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    }

    // 5. Generate sequential invoice number
    const invoiceNumber = await generateSequentialInvoiceNumber(salonId);

    // 6. Compile PDF invoice buffer
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      salon,
      customer,
      staff,
      appointment,
      services
    });

    // 7. Upload PDF to Firebase Storage (returns public download URL)
    const { downloadUrl, storagePath } = await uploadInvoicePDF(salonId, invoiceNumber, pdfBuffer);

    // 8. Calculations (inclusive 18% GST)
    const grandTotal = appointment.amountPaid;
    const taxableAmount = grandTotal / 1.18;
    const gstAmount = grandTotal - taxableAmount;
    
    // Loyalty points calculation
    const loyaltyRatio = salon.loyaltyPointsRatio || 5;
    const pointsEarned = Math.floor(grandTotal * (loyaltyRatio / 100));

    // 9. Save Metadata to Firestore using Admin SDK
    await saveInvoiceMetadata(salonId, {
      id: appointmentId,
      invoiceNumber,
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      appointmentId,
      staffId: appointment.staffId,
      staffName: staff.name,
      subtotal: appointment.subtotal,
      gstAmount,
      finalAmount: grandTotal,
      paymentMethod: appointment.paymentMethod,
      invoiceUrl: downloadUrl,
      storagePath,
      whatsappStatus: 'pending',
      printCount: 0
    });

    // 10. Centralized WhatsApp notification dispatch if requested
    let whatsappStatus: 'sent' | 'failed' = 'failed';
    if (sendWhatsApp && salon.automatedWhatsappEnabled) {
      const feedbackUrl = `${req.headers.get('origin') || `https://${req.headers.get('host')}`}/feedback/${salonId}_${appointmentId}`;
      const notifyResult = await sendWhatsAppInvoiceNotification({
        salonId,
        salonName: salon.name,
        customerPhone: appointment.customerPhone,
        customerName: appointment.customerName,
        invoiceNumber,
        grandTotal,
        pointsEarned,
        pdfUrl: downloadUrl,
        feedbackUrl,
        paymentMethod: appointment.paymentMethod,
        currentPoints: customer.loyaltyPoints || 0
      });

      if (notifyResult.success) {
        whatsappStatus = 'sent';
        // Update whatsappStatus in Firestore using Admin SDK
        await existingInvoiceRef.update({ whatsappStatus: 'sent' });
      }
    }

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceUrl: downloadUrl,
      whatsappStatus: sendWhatsApp ? whatsappStatus : 'skipped'
    });
  } catch (error: any) {
    console.error('[Invoice API Route] Error executing invoice pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
