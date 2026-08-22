import { NextResponse } from 'next/server';
import { getAdminDb } from '@/services/billing/config';
import { generateInvoicePDF } from '@/services/billing/invoiceGenerator';
import type { Appointment, Salon, Customer, Staff, Service } from '@/lib/data';
import { FieldPath } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * Public HTTPS PDF Streaming Endpoint for Twilio WhatsApp Document Attachments & Browser Invoices
 * GET /api/invoices/[invoiceId]/pdf
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const params = await props.params;
    const { invoiceId } = params;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Check if ID contains salonId prefix (e.g. salonId_appointmentId or just invoiceId)
    let salonId = '';
    let appointmentId = invoiceId;

    if (invoiceId.includes('_')) {
      const parts = invoiceId.split('_');
      salonId = parts[0];
      appointmentId = parts.slice(1).join('_');
    }

    // If salonId not in param, query salons to locate the invoice or appointment
    let salonData: any = null;
    let invoiceData: any = null;
    let appointmentData: any = null;

    if (salonId) {
      const salonSnap = await db.doc(`salons/${salonId}`).get();
      if (salonSnap.exists) {
        salonData = { id: salonSnap.id, ...salonSnap.data() };
      }

      // Try reading directly from invoices or appointments
      const invSnap = await db.doc(`salons/${salonId}/invoices/${appointmentId}`).get();
      if (invSnap.exists) {
        invoiceData = { id: invSnap.id, ...invSnap.data() };
      }

      const apptSnap = await db.doc(`salons/${salonId}/appointments/${appointmentId}`).get();
      if (apptSnap.exists) {
        appointmentData = { id: apptSnap.id, ...apptSnap.data() };
      }
    } else {
      // Search across salons
      const salonsSnap = await db.collection('salons').get();
      for (const sDoc of salonsSnap.docs) {
        const sId = sDoc.id;
        const invSnap = await db.doc(`salons/${sId}/invoices/${appointmentId}`).get();
        if (invSnap.exists) {
          salonId = sId;
          salonData = { id: sDoc.id, ...sDoc.data() };
          invoiceData = { id: invSnap.id, ...invSnap.data() };
          break;
        }

        const apptSnap = await db.doc(`salons/${sId}/appointments/${appointmentId}`).get();
        if (apptSnap.exists) {
          salonId = sId;
          salonData = { id: sDoc.id, ...sDoc.data() };
          appointmentData = { id: apptSnap.id, ...apptSnap.data() };
          break;
        }
      }
    }

    if (!salonData) {
      salonData = {
        name: 'SalonFlow',
        address: 'Salon Address',
        phone: '+91 98765 43210',
        email: 'billing@salonflow.in',
      };
    }

    const customerName = invoiceData?.customer || invoiceData?.customerName || appointmentData?.customer || appointmentData?.customerName || 'Customer';
    const customerPhone = invoiceData?.phone || invoiceData?.customerPhone || appointmentData?.phone || appointmentData?.customerPhone || '';
    const invoiceNo = invoiceData?.invoiceNo || invoiceData?.invoiceNumber || `INV-2026-${appointmentId.slice(-4)}`;
    const totalAmount = invoiceData?.total || invoiceData?.finalAmount || appointmentData?.totalPaid || appointmentData?.price || 500;
    const items = invoiceData?.items || appointmentData?.service || 'Salon Service';
    const paymentMethod = invoiceData?.method || invoiceData?.paymentMethod || appointmentData?.paymentMode || 'Cash';

    // Construct customer object
    const customer: Customer = {
      id: invoiceData?.customerId || appointmentData?.customerId || 'cust',
      name: customerName,
      phone: customerPhone,
      salonId,
      visitHistory: [],
    } as any;

    const staff: Staff = {
      id: 'staff-1',
      name: salonData.managerName || 'Stylist',
      role: 'stylist',
      status: 'active',
    } as any;

    const appointment: Appointment = {
      id: appointmentId,
      salonId,
      customerId: customer.id,
      customerName,
      customerPhone,
      staffId: staff.id,
      serviceIds: [],
      date: invoiceData?.date || new Date().toISOString(),
      time: '10:00 AM',
      status: 'completed',
      subtotal: totalAmount / 1.18,
      tax: totalAmount - (totalAmount / 1.18),
      discount: 0,
      totalAmount,
      amountPaid: totalAmount,
      paymentStatus: 'paid',
      paymentMethod,
    } as any;

    const servicesList: Service[] = [
      {
        id: 'srv-1',
        salonId,
        name: typeof items === 'string' ? items : 'Salon Services',
        category: 'Salon',
        duration: 30,
        price: totalAmount,
      } as any,
    ];

    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber: invoiceNo,
      salon: salonData as Salon,
      customer,
      staff,
      appointment,
      services: servicesList,
    });

    const response = new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoiceNo}.pdf"`,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });

    return response;
  } catch (error: any) {
    console.error('[Invoice PDF Route] Failed to stream PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
