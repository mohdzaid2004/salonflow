import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/services/billing/config';
import { getRazorpayInstance, getRazorpayPlanId, logSafeDiagnosticError } from '@/services/billing/razorpay';

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

    // Load static configurations and validate credentials
    let resolvedPlanId: string;
    let instance: any;
    try {
      resolvedPlanId = getRazorpayPlanId(planId);
      instance = getRazorpayInstance();
    } catch (configError: any) {
      console.error('[Subscription API] Pre-flight config validation failed:', configError.message);
      const isMissing = configError.message.includes('not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: isMissing 
            ? 'Razorpay payments are not configured yet. Please contact the administrator.'
            : 'Payment configuration error. Please try again later.'
        },
        { status: isMissing ? 503 : 500 }
      );
    }

    console.log(`[Subscription API] Mapped plan "${planId}" -> "${resolvedPlanId}". Creating Razorpay subscription...`);

    try {
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
    } catch (apiError: any) {
      logSafeDiagnosticError('/v1/subscriptions', apiError);
      
      const isAuthError = apiError.statusCode === 401 || 
        (apiError.error && typeof apiError.error === 'object' && 
         apiError.error.description && 
         apiError.error.description.toLowerCase().includes('auth'));
         
      return NextResponse.json(
        { 
          success: false, 
          error: isAuthError 
            ? 'Payment configuration error. Please try again later.' 
            : (apiError.error?.description || apiError.message || 'Failed to create subscription with payment provider.') 
        },
        { status: isAuthError ? 401 : 500 }
      );
    }
  } catch (error: any) {
    console.error('[Subscription API] Unexpected failure:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
