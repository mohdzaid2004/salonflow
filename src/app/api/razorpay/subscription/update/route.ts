import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/services/billing/config';
import { getRazorpayInstance, getRazorpayPlanId } from '@/services/billing/razorpay';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing Token' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    getAdminApp();
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const body = await req.json();
    const { action, planId, salonId } = body;

    if (!salonId) {
      return NextResponse.json({ success: false, error: 'salonId is required.' }, { status: 400 });
    }

    // Security Gate: Ensure uid matches salonId
    if (uid !== salonId) {
      return NextResponse.json({ success: false, error: 'Forbidden: Salon ID mismatch.' }, { status: 403 });
    }

    const db = getAdminDb();
    const salonRef = db.doc(`salons/${salonId}`);
    const salonSnap = await salonRef.get();
    
    if (!salonSnap.exists) {
      return NextResponse.json({ success: false, error: 'Salon not found.' }, { status: 404 });
    }

    const salonData = salonSnap.data() || {};
    const subscriptionId = salonData.subscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ success: false, error: 'No active subscription found to modify.' }, { status: 400 });
    }

    const instance = getRazorpayInstance();

    if (action === 'change_plan') {
      if (!planId) {
        return NextResponse.json({ success: false, error: 'planId is required for changing plan.' }, { status: 400 });
      }

      const newPlanId = getRazorpayPlanId(planId);
      console.log(`[Subscription API] Updating Razorpay subscription ${subscriptionId} to plan ${planId} (${newPlanId})...`);

      // Price classification for upgrade vs downgrade (Starter: 499, Professional: 999, Business: 1999)
      const priceMap: Record<string, number> = { starter: 499, professional: 999, business: 1999 };
      const currentPlanType = salonData.subscriptionPlanId || 'starter';
      const currentPrice = priceMap[currentPlanType] || 0;
      const newPrice = priceMap[planId] || 0;
      
      const scheduleChangeAt = newPrice >= currentPrice ? 'now' : 'cycle_end';

      const updatedSub = await instance.subscriptions.update(subscriptionId, {
        plan_id: newPlanId,
        schedule_change_at: scheduleChangeAt,
        customer_notify: 1
      });

      console.log(`[Subscription API] Subscription update request sent to Razorpay. Response status: ${updatedSub.status}`);

      // Sync Firestore immediately for upgrades, webhook handles scheduled changes
      if (scheduleChangeAt === 'now') {
        await salonRef.update({
          subscriptionPlanId: planId,
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      return NextResponse.json({
        success: true,
        message: scheduleChangeAt === 'now' 
          ? 'Plan updated immediately.' 
          : 'Plan downgrade scheduled to take effect at the end of the billing cycle.',
        subscription: updatedSub
      });

    } else if (action === 'cancel') {
      console.log(`[Subscription API] Cancelling Razorpay subscription ${subscriptionId}...`);

      // Cancel at end of current billing cycle (true) to allow user access for the remainder of their paid period
      const cancelledSub = await instance.subscriptions.cancel(subscriptionId, true);

      console.log(`[Subscription API] Subscription cancellation requested. Response status: ${cancelledSub.status}`);

      return NextResponse.json({
        success: true,
        message: 'Subscription set to cancel at the end of the current billing cycle.',
        subscription: cancelledSub
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });

  } catch (error: any) {
    console.error('[Subscription API] Error modifying subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
