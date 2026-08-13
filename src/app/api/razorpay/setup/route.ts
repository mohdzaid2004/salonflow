import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check both standard names and the user's console screenshot names (API key / Secret)
  const keyId = process.env.RAZORPAY_KEY_ID || process.env['API key'] || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env['Secret'] || '';

  if (!keyId || !keySecret) {
    return NextResponse.json({
      success: false,
      error: 'Razorpay Key ID or Secret is not configured in backend environment.',
      detectedEnvKeys: Object.keys(process.env).filter(k => 
        k.toLowerCase().includes('razor') || 
        k.toLowerCase().includes('api') || 
        k.toLowerCase().includes('secret') ||
        k.toLowerCase().includes('key')
      )
    });
  }

  try {
    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const results: any[] = [];
    const plansToCreate = [
      { name: 'SalonFlow Starter', price: 499, key: 'STARTER' },
      { name: 'SalonFlow Professional', price: 999, key: 'PROFESSIONAL' },
      { name: 'SalonFlow Business', price: 1999, key: 'BUSINESS' }
    ];

    for (const plan of plansToCreate) {
      try {
        const response = await instance.plans.create({
          period: 'monthly',
          interval: 1,
          item: {
            name: plan.name,
            amount: plan.price * 100, // paise
            currency: 'INR',
            description: `${plan.name} Plan - Monthly Recurring Subscription`
          }
        });
        results.push({ key: plan.key, success: true, planId: response.id });
      } catch (err: any) {
        results.push({
          key: plan.key,
          success: false,
          error: err.error?.description || err.message || JSON.stringify(err)
        });
      }
    }

    return NextResponse.json({
      success: true,
      environment: keyId.startsWith('rzp_test_') ? 'TEST' : 'LIVE',
      keyIdPrefix: keyId.substring(0, 8) + '****',
      results
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || JSON.stringify(err)
    });
  }
}
