import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/services/billing/config';
import { getRazorpayInstance, getPlanId } from '@/services/billing/razorpay';

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
    const { planId, salonId } = body; // planId: 'starter' | 'professional' | 'business'

    if (!planId || !salonId) {
      return NextResponse.json({ success: false, error: 'planId and salonId are required.' }, { status: 400 });
    }

    // Security Gate: Ensure authenticated UID matches the targeted salonId
    if (uid !== salonId) {
      return NextResponse.json({ success: false, error: 'Forbidden: Salon ID mismatch.' }, { status: 403 });
    }

    const resolvedPlanId = await getPlanId(planId);
    const instance = getRazorpayInstance();

    console.log(`[Subscription API] Creating Razorpay subscription for UID: ${uid}, Plan: ${planId} (${resolvedPlanId})...`);

    const subscription = await instance.subscriptions.create({
      plan_id: resolvedPlanId,
      total_count: 60, // 5 years monthly cycle
      quantity: 1,
      customer_notify: 1,
      notes: {
        firebaseUid: uid,
        salonId: salonId,
        planId: planId
      }
    });

    console.log(`[Subscription API] Subscription created successfully. ID: ${subscription.id}`);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error('[Subscription API] Error creating subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
