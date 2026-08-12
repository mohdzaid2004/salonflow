import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getAdminDb, getAdminApp } from '@/services/billing/config';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!signature) {
      console.error('[Razorpay Webhook] Error: x-razorpay-signature header is missing.');
      return NextResponse.json({ success: false, error: 'Signature missing' }, { status: 400 });
    }

    // Verify webhook signature using SDK
    try {
      Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
    } catch (sigErr: any) {
      console.error('[Razorpay Webhook] Signature verification failed:', sigErr.message || sigErr);
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.id;
    const eventName = payload.event;
    console.log(`[Razorpay Webhook] Signature verified. Event ID: ${eventId}, Name: ${eventName}`);

    getAdminApp();
    const db = getAdminDb();

    // Idempotency check: Guard against duplicate webhook deliveries
    const eventDocRef = db.doc(`razorpay_events/${eventId}`);
    const eventSnap = await eventDocRef.get();
    if (eventSnap.exists) {
      console.log(`[Razorpay Webhook] Event ID ${eventId} was already processed. Skipping...`);
      return NextResponse.json({ success: true, message: 'Duplicate event skipped.' });
    }

    // Mark event as processed
    await eventDocRef.set({
      processedAt: FieldValue.serverTimestamp(),
      eventName
    });

    const entity = payload.payload.subscription?.entity;
    if (!entity) {
      console.warn('[Razorpay Webhook] Warning: Payload does not contain a subscription entity.');
      return NextResponse.json({ success: true });
    }

    const notes = entity.notes || {};
    const firebaseUid = notes.firebaseUid || '';
    const salonId = notes.salonId || '';
    const planId = notes.planId || 'starter'; // starter, professional, business

    if (!salonId) {
      console.warn('[Razorpay Webhook] Warning: No salonId found in notes. Skipping updates.');
      return NextResponse.json({ success: true });
    }

    const salonRef = db.doc(`salons/${salonId}`);
    const subscriptionId = entity.id;
    const planName = planId.charAt(0).toUpperCase() + planId.slice(1);

    // Prepare date objects safely
    const currentStart = entity.current_start ? Timestamp.fromMillis(entity.current_start * 1000) : FieldValue.serverTimestamp();
    const currentEnd = entity.current_end ? Timestamp.fromMillis(entity.current_end * 1000) : FieldValue.serverTimestamp();
    const chargeAt = entity.charge_at ? Timestamp.fromMillis(entity.charge_at * 1000) : FieldValue.serverTimestamp();

    console.log(`[Razorpay Webhook] Processing event: ${eventName} for Salon: ${salonId}, Plan: ${planId}`);

    switch (eventName) {
      case 'subscription.authenticated':
      case 'subscription.activated':
        // Update salon tenant status
        await salonRef.update({
          billingStatus: 'active',
          subscriptionPlanId: planId,
          subscriptionId: subscriptionId,
          subscriptionStatus: 'active',
          nextBillingDate: chargeAt,
          updatedAt: FieldValue.serverTimestamp()
        });

        // Save detailed subscription metadata to root subscriptions
        await db.doc(`subscriptions/${subscriptionId}`).set({
          subscriptionId,
          razorpaySubscriptionId: subscriptionId,
          razorpayPlanId: entity.plan_id,
          firebaseUid,
          salonId,
          planId,
          planName,
          status: 'active',
          billingCycle: 'monthly',
          amount: entity.paid_count === 0 ? 0 : (entity.plan_id ? entity.plan_id.amount / 100 : 0), // fallback
          currency: 'INR',
          startDate: entity.start_at ? Timestamp.fromMillis(entity.start_at * 1000) : FieldValue.serverTimestamp(),
          currentStart,
          currentEnd,
          nextBillingDate: chargeAt,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        break;

      case 'subscription.charged':
        const paymentEntity = payload.payload.payment?.entity;
        const paymentId = paymentEntity?.id || `pay_fallback_${Date.now()}`;
        const invoiceId = paymentEntity?.invoice_id || `inv_fallback_${Date.now()}`;
        const chargeAmount = paymentEntity ? paymentEntity.amount / 100 : 0; // convert paise to INR

        // 1. Log bookkeeping payment record
        await db.doc(`salons/${salonId}/payments/${paymentId}`).set({
          razorpayPaymentId: paymentId,
          razorpayInvoiceId: invoiceId,
          razorpaySubscriptionId: subscriptionId,
          amount: chargeAmount,
          currency: paymentEntity?.currency || 'INR',
          status: 'paid',
          paidAt: paymentEntity?.created_at ? Timestamp.fromMillis(paymentEntity.created_at * 1000) : FieldValue.serverTimestamp(),
          planId,
          firebaseUid,
          salonId,
          createdAt: FieldValue.serverTimestamp()
        });

        // 2. Update salon billing information
        await salonRef.update({
          billingStatus: 'active',
          lastPaymentStatus: 'paid',
          lastPaymentDate: paymentEntity?.created_at ? Timestamp.fromMillis(paymentEntity.created_at * 1000) : FieldValue.serverTimestamp(),
          lastPaymentAmount: chargeAmount,
          nextBillingDate: chargeAt,
          updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Update root subscription info
        await db.doc(`subscriptions/${subscriptionId}`).update({
          currentStart,
          currentEnd,
          nextBillingDate: chargeAt,
          updatedAt: FieldValue.serverTimestamp()
        });
        break;

      case 'subscription.pending':
        await salonRef.update({
          billingStatus: 'pending',
          updatedAt: FieldValue.serverTimestamp()
        });
        await db.doc(`subscriptions/${subscriptionId}`).update({
          status: 'pending',
          updatedAt: FieldValue.serverTimestamp()
        });
        break;

      case 'subscription.halted':
        await salonRef.update({
          billingStatus: 'halted',
          updatedAt: FieldValue.serverTimestamp()
        });
        await db.doc(`subscriptions/${subscriptionId}`).update({
          status: 'halted',
          updatedAt: FieldValue.serverTimestamp()
        });
        break;

      case 'subscription.cancelled':
        await salonRef.update({
          billingStatus: 'cancelled',
          updatedAt: FieldValue.serverTimestamp()
        });
        await db.doc(`subscriptions/${subscriptionId}`).update({
          status: 'cancelled',
          updatedAt: FieldValue.serverTimestamp()
        });
        break;

      default:
        console.log(`[Razorpay Webhook] Unhandled event name: ${eventName}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Razorpay Webhook] Error processing event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
