import Razorpay from 'razorpay';

export function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  
  if (!keyId || !keySecret) {
    console.warn('[Razorpay Init] Warning: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables are missing.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Resolves a plan ID for a given plan type. If the plan ID environment variable is not defined,
 * it will automatically create a monthly plan dynamically via the Razorpay API under the active credentials,
 * and return the new ID.
 */
export async function getPlanId(planType: 'starter' | 'professional' | 'business'): Promise<string> {
  const envMap = {
    starter: process.env.RAZORPAY_STARTER_PLAN_ID,
    professional: process.env.RAZORPAY_PROFESSIONAL_PLAN_ID,
    business: process.env.RAZORPAY_BUSINESS_PLAN_ID,
  };

  const envVal = envMap[planType];
  if (envVal) {
    return envVal;
  }

  // Fallback to dynamic creation
  const instance = getRazorpayInstance();
  const planDetailsMap = {
    starter: { name: 'SalonFlow Starter', price: 499 },
    professional: { name: 'SalonFlow Professional', price: 999 },
    business: { name: 'SalonFlow Business', price: 1999 },
  };

  const details = planDetailsMap[planType];
  console.log(`[Razorpay Config] Plan ID for "${planType}" is missing in env. Dynamically creating monthly plan...`);
  
  try {
    const plan = await instance.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: details.name,
        amount: details.price * 100, // paise
        currency: 'INR',
        description: `${details.name} Plan - Monthly Recurring Subscription`,
      },
    });
    console.log(`[Razorpay Config] Dynamic plan creation successful. Type: ${planType}, Plan ID: ${plan.id}`);
    return plan.id;
  } catch (err: any) {
    console.error(`[Razorpay Config] Failed to create dynamic plan for ${planType}:`, err);
    throw new Error(`Failed to resolve plan ID: ${err.message || err}`);
  }
}
