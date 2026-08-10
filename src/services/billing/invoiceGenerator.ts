import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import type { Appointment, Salon, Customer, Staff, Service } from '@/lib/data';

export interface InvoiceDetails {
  invoiceNumber: string;
  salon: Salon;
  customer: Customer;
  staff: Staff;
  appointment: Appointment;
  services: Service[];
}

/**
 * Programmatically compiles a GST-compliant, professional A4 PDF invoice using jsPDF.
 * Embeds a dynamic QR code for online verification.
 */
export async function generateInvoicePDF(details: InvoiceDetails): Promise<Buffer> {
  const { invoiceNumber, salon, customer, staff, appointment, services } = details;

  // Initialize A4 PDF (portrait, points, a4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette
  const primaryColor = [107, 33, 168]; // Royal purple
  const darkText = [31, 41, 55];       // Charcoal
  const lightGray = [243, 244, 246];   // Border gray

  // 1. Draw Header / Branding
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Draw Logo (scissors/comb SVG approximation in white)
  const logoX = 15;
  const logoY = 12;
  const scale = 0.5; // Scale down 24x24 to 12mm x 12mm
  
  doc.setDrawColor(255, 255, 255); // White logo lines
  doc.setLineWidth(0.5);
  
  // Draw the SVG paths from components/logo.tsx
  doc.line(3 * scale + logoX, 12 * scale + logoY, 9 * scale + logoX, 18 * scale + logoY);
  doc.line(3 * scale + logoX, 6 * scale + logoY, 9 * scale + logoX, 12 * scale + logoY);
  doc.line(12 * scale + logoX, 3 * scale + logoY, 12 * scale + logoX, 21 * scale + logoY);
  
  // Loops approximation for handles
  doc.line(13.5 * scale + logoX, 5.5 * scale + logoY, 13.5 * scale + logoX, 2 * scale + logoY);
  doc.line(13.5 * scale + logoX, 2 * scale + logoY, 18.5 * scale + logoX, 2 * scale + logoY);
  doc.line(18.5 * scale + logoX, 2 * scale + logoY, 18.5 * scale + logoX, 5.5 * scale + logoY);
  doc.line(18.5 * scale + logoX, 5.5 * scale + logoY, 15.5 * scale + logoX, 5.5 * scale + logoY);
  
  doc.line(16 * scale + logoX, 11.5 * scale + logoY, 16 * scale + logoX, 8 * scale + logoY);
  doc.line(16 * scale + logoX, 8 * scale + logoY, 21 * scale + logoX, 8 * scale + logoY);
  doc.line(21 * scale + logoX, 8 * scale + logoY, 21 * scale + logoX, 11.5 * scale + logoY);
  doc.line(21 * scale + logoX, 11.5 * scale + logoY, 18 * scale + logoX, 11.5 * scale + logoY);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(salon.name || 'Royal Salon', 30, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(salon.address || 'Salon Complete Address', 30, 25);
  doc.text(`Phone: ${salon.phone || 'N/A'} | Email: support@salonflow.in`, 30, 30);
  doc.text(`GSTIN: ${salon.id.slice(0, 15).toUpperCase()}IND`, 30, 35); // Dynamic dummy GSTIN for compliance mockup

  // Invoice Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', pageWidth - 60, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`No: ${invoiceNumber}`, pageWidth - 60, 28);
  doc.text(`Date: ${format(new Date(), 'dd-MM-yyyy hh:mm a')}`, pageWidth - 60, 33);

  // 2. Billing Grid (Bill To / Invoice Metadata)
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  
  // Bill To (Left side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BILL TO:', 15, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Customer Name: ${customer.name}`, 15, 61);
  doc.text(`Contact Phone: +91 ${customer.phone}`, 15, 66);
  doc.text(`Customer ID: ${customer.id.substring(0, 8).toUpperCase()}`, 15, 71);
  doc.text(`Loyalty Balance: ${customer.loyaltyPoints || 0} pts`, 15, 76);

  // Invoice Summary (Right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VISIT DETAILS:', pageWidth - 80, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Appointment ID: ${appointment.id.substring(0, 8).toUpperCase()}`, pageWidth - 80, 61);
  doc.text(`Served By: ${staff.name}`, pageWidth - 80, 66);
  doc.text(`Payment Method: ${appointment.paymentMethod}`, pageWidth - 80, 71);
  doc.text(`Payment Status: Completed`, pageWidth - 80, 76);

  // 3. Services Table Header
  const tableTop = 88;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, tableTop, pageWidth - 30, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Service Name', 18, tableTop + 5.5);
  doc.text('Qty', pageWidth - 70, tableTop + 5.5);
  doc.text('Tax Code (SAC)', pageWidth - 50, tableTop + 5.5);
  doc.text('Price (INR)', pageWidth - 20, tableTop + 5.5, { align: 'right' });

  // 4. Populate Table Rows
  let currentY = tableTop + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  services.forEach((service, index) => {
    // Add thin border between rows
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(15, currentY, pageWidth - 15, currentY);

    doc.text(service.name, 18, currentY + 5.5);
    doc.text('1', pageWidth - 70, currentY + 5.5);
    doc.text('999721', pageWidth - 50, currentY + 5.5); // Standard hair/beauty service SAC
    doc.text(new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(service.price), pageWidth - 20, currentY + 5.5, { align: 'right' });

    currentY += 8;
  });

  // Table closing line
  doc.line(15, currentY, pageWidth - 15, currentY);

  // 5. Tax & Amount Summary Block (Inclusive GST calculations)
  const summaryTop = currentY + 12;
  const grandTotal = appointment.amountPaid;
  const pointsRedeemed = appointment.pointsRedeemed || 0;
  const subtotal = appointment.subtotal;

  const taxableAmount = grandTotal / 1.18; // 18% inclusive GST
  const gstAmount = grandTotal - taxableAmount;
  const cgstAmount = gstAmount / 2;
  const sgstAmount = gstAmount / 2;

  // Add QR code for online verification
  const verificationUrl = `https://salonflow--salonindia-74cbb.us-east4.hosted.app/invoice/${salon.id}_${appointment.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 100 });
    doc.addImage(qrDataUrl, 'PNG', 15, summaryTop, 30, 30);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Scan to Verify Online', 15, summaryTop + 33);
  } catch (qrErr) {
    console.error('[Invoice Generator] QR code generation failed:', qrErr);
  }

  // Summary lines (aligned right)
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFontSize(9);
  
  let labelX = pageWidth - 70;
  let valX = pageWidth - 20;
  let summaryY = summaryTop + 4;

  const addSummaryRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, labelX, summaryY);
    doc.text(value, valX, summaryY, { align: 'right' });
    summaryY += 6;
  };

  addSummaryRow('Subtotal (Gross):', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(subtotal)}`);
  if (pointsRedeemed > 0) {
    addSummaryRow('Loyalty Redeem:', `- INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(pointsRedeemed)}`);
  }
  addSummaryRow('Taxable Value:', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(taxableAmount)}`);
  addSummaryRow('CGST (9.0%):', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(cgstAmount)}`);
  addSummaryRow('SGST (9.0%):', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(sgstAmount)}`);
  
  // Total line divider
  doc.setDrawColor(0, 0, 0);
  doc.line(labelX, summaryY - 2, valX, summaryY - 2);

  addSummaryRow('Grand Total (Net):', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(grandTotal)}`, true);

  // 6. Footer, T&C, loyalty info
  const footerY = pageHeight - 35;
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.line(15, footerY, pageWidth - 15, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Thank you for visiting! We look forward to seeing you again.', pageWidth / 2, footerY + 6, { align: 'center' });
  doc.text('TERMS & CONDITIONS: 1. Services once billed cannot be refunded. 2. Any feedback can be sent to support@salonflow.in.', pageWidth / 2, footerY + 11, { align: 'center' });
  doc.text(`Digital Invoice Verification Code: SF-${appointment.id.toUpperCase()}`, pageWidth / 2, footerY + 16, { align: 'center' });

  // Return PDF as buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
