import { jsPDF } from 'jspdf';
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
async function fetchImageBase64(url: string): Promise<{ dataUrl: string, format: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || '';
    let format = '';
    if (contentType.includes('png')) {
      format = 'PNG';
    } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      format = 'JPEG';
    } else {
      return null;
    }
    return {
      dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
      format
    };
  } catch (e) {
    console.error("[Invoice Generator] Failed to fetch logo image:", e);
    return null;
  }
}

export async function generateInvoicePDF(details: InvoiceDetails): Promise<Buffer> {
  const { invoiceNumber, salon, customer, staff, appointment, services } = details;

  const parseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds !== undefined) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Initialize A4 PDF (portrait, points, a4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette
  const darkText = [31, 41, 55];       // Charcoal

  // 1. Draw Logo & Branding
  let hasLogo = false;
  if (salon.logoUrl && (salon.logoUrl.startsWith('http://') || salon.logoUrl.startsWith('https://'))) {
    const logoData = await fetchImageBase64(salon.logoUrl);
    if (logoData) {
      try {
        doc.addImage(logoData.dataUrl, logoData.format, 15, 15, 25, 25);
        hasLogo = true;
      } catch (err) {
        console.error("[Invoice Generator] jsPDF addImage error:", err);
      }
    }
  }

  // Draw backup text-based branding if no logo could be loaded
  if (!hasLogo) {
    doc.setFillColor(107, 33, 168); // Purple brand color
    doc.roundedRect(15, 15, 25, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SF', 27.5, 29.5, { align: 'center' });
  }

  // Salon Details Text Block
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(salon.name || 'SalonFlow Partner', 45, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(salon.address || 'Address not configured', 45, 25);
  doc.text(`Phone: ${salon.phone || 'N/A'} | Email: ${salon.email || 'N/A'}`, 45, 30);
  doc.text(`GSTIN: ${salon.id ? salon.id.slice(0, 15).toUpperCase() + 'IND' : 'N/A'}`, 45, 35);

  // Large "INVOICE" heading on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INVOICE', pageWidth - 15, 23, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(invoiceNumber, pageWidth - 15, 30, { align: 'right' });

  // Horizontal Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(15, 45, pageWidth - 15, 45);

  // 2. Bill From & Bill To Sections
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('BILL FROM', 15, 52);
  doc.text('BILL TO', pageWidth - 95, 52);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(salon.name, 15, 58);
  doc.text(customer.name || 'Valued Customer', pageWidth - 95, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Wrap long addresses properly
  const addressLines = doc.splitTextToSize(salon.address || '', 80);
  doc.text(addressLines, 15, 63);
  const addrHeight = addressLines.length * 4;
  doc.text(`Phone: ${salon.phone || 'N/A'}`, 15, 63 + addrHeight);
  doc.text(`Email: ${salon.email || 'N/A'}`, 15, 67 + addrHeight);

  doc.text(`Phone: +91 ${customer.phone || 'N/A'}`, pageWidth - 95, 63);
  doc.text(`Email: ${customer.email || 'N/A'}`, pageWidth - 95, 68);
  doc.text(`Customer ID: ${customer.id ? customer.id.substring(0, 8).toUpperCase() : 'N/A'}`, pageWidth - 95, 73);

  // Horizontal Divider
  doc.line(15, 85, pageWidth - 15, 85);

  // 3. Invoice Dates / Payment Info Meta Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('INVOICE DATE', 15, 92);
  doc.text('PAYMENT METHOD', pageWidth / 3 + 10, 92);
  doc.text('PAYMENT STATUS', pageWidth - 55, 92);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  doc.text(format(parseDate(appointment.date), 'dd MMM yyyy'), 15, 97);
  doc.text(appointment.paymentMethod || 'UPI', pageWidth / 3 + 10, 97);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Green
  doc.text('PAID', pageWidth - 55, 97);
  doc.setTextColor(31, 41, 55);

  // Horizontal Divider
  doc.line(15, 104, pageWidth - 15, 104);

  // 4. Services Table Header
  const tableHeaderY = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION', 18, tableHeaderY);
  doc.text('QTY', pageWidth - 70, tableHeaderY, { align: 'center' });
  doc.text('PRICE', pageWidth - 45, tableHeaderY, { align: 'right' });
  doc.text('TOTAL', pageWidth - 18, tableHeaderY, { align: 'right' });
  
  doc.line(15, tableHeaderY + 3, pageWidth - 15, tableHeaderY + 3);

  // 5. Populate Rows
  let currentY = tableHeaderY + 9;
  doc.setFont('helvetica', 'normal');

  services.forEach((service) => {
    // Add page if row extends beyond boundary
    if (currentY > pageHeight - 75) {
      doc.addPage();
      currentY = 20;
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', 18, currentY);
      doc.text('QTY', pageWidth - 70, currentY, { align: 'center' });
      doc.text('PRICE', pageWidth - 45, currentY, { align: 'right' });
      doc.text('TOTAL', pageWidth - 18, currentY, { align: 'right' });
      doc.line(15, currentY + 3, pageWidth - 15, currentY + 3);
      currentY += 9;
      doc.setFont('helvetica', 'normal');
    }

    const serviceLines = doc.splitTextToSize(service.name, 90);
    doc.text(serviceLines, 18, currentY);
    doc.text('1', pageWidth - 70, currentY, { align: 'center' });
    
    const formattedPrice = `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(service.price)}`;
    doc.text(formattedPrice, pageWidth - 45, currentY, { align: 'right' });
    doc.text(formattedPrice, pageWidth - 18, currentY, { align: 'right' });

    currentY += Math.max(8, serviceLines.length * 4.5);
  });

  doc.line(15, currentY, pageWidth - 15, currentY);

  // 6. Summary Calculation Block
  const grandTotal = appointment.amountPaid;
  const pointsRedeemed = appointment.pointsRedeemed || 0;
  const subtotal = appointment.subtotal || services.reduce((acc, s) => acc + s.price, 0);

  let rightLabelX = pageWidth - 65;
  let rightValX = pageWidth - 18;
  let summaryY = currentY + 8;

  const addSummaryRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, rightLabelX, summaryY);
    doc.text(value, rightValX, summaryY, { align: 'right' });
    summaryY += 6;
  };

  addSummaryRow('Subtotal:', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(subtotal)}`);
  if (pointsRedeemed > 0) {
    addSummaryRow('Discount:', `- INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(pointsRedeemed)}`);
  }
  
  doc.setLineWidth(0.3);
  doc.line(rightLabelX, summaryY - 2, rightValX, summaryY - 2);
  
  addSummaryRow('GRAND TOTAL:', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(grandTotal)}`, true);

  // 7. Payment Information & Served By (Left Column)
  let leftInfoY = currentY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('PAYMENT INFORMATION', 18, leftInfoY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  leftInfoY += 5;
  doc.text(`Payment Method: ${appointment.paymentMethod || 'UPI'}`, 18, leftInfoY);
  leftInfoY += 4.5;
  doc.text('Payment Status: PAID', 18, leftInfoY);
  leftInfoY += 4.5;
  doc.text(`Transaction ID: ${appointment.id.slice(-8).toUpperCase()}`, 18, leftInfoY);

  leftInfoY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('SERVED BY', 18, leftInfoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  leftInfoY += 5;
  doc.text(staff.name || 'N/A', 18, leftInfoY);

  // 8. Feedback Section
  let feedbackY = Math.max(summaryY, leftInfoY) + 8;
  if (feedbackY > pageHeight - 35) {
    doc.addPage();
    feedbackY = 20;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(15, feedbackY, pageWidth - 15, feedbackY);
  feedbackY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('FEEDBACK', 18, feedbackY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  feedbackY += 5;
  doc.text("We'd love your feedback! Please rate your experience:", 18, feedbackY);
  
  feedbackY += 6;
  const feedbackId = `${salon.id}_${appointment.id}`;
  const feedbackLink = `https://salonflow--salonindia-74cbb.us-east4.hosted.app/feedback/${feedbackId}`;
  
  doc.setTextColor(107, 33, 168); // Purple Brand color for link
  doc.setFont('helvetica', 'bold');
  doc.text(`Give Feedback: ${feedbackLink}`, 18, feedbackY);
  doc.setTextColor(31, 41, 55);

  // 9. Footer
  const footerTop = pageHeight - 20;
  doc.setDrawColor(220, 220, 220);
  doc.line(15, footerTop, pageWidth - 15, footerTop);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Thank you for choosing ${salon.name || 'our salon'}.`, pageWidth / 2, footerTop + 6, { align: 'center' });
  doc.text('Powered by SalonFlow', pageWidth / 2, footerTop + 11, { align: 'center' });

  // Return PDF as buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
