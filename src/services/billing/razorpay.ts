import Razorpay from 'razorpay';

export function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured yet. Please contact the administrator.');
  }

  const isTest = keyId.startsWith('rzp_test_');
  const isLive = keyId.startsWith('rzp_live_');
  
  if (!isTest && !isLive) {
    throw new Error('Payment configuration error. Please try again later.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Returns the configured static Razorpay Plan ID for a given plan type.
 * Maps 'starter', 'professional', and 'business' directly to environment variables.
 * Dynamic plan creation at checkout is strictly disabled for production stability.
 */
export function getRazorpayPlanId(planType: 'starter' | 'professional' | 'business'): string {
  const planMap: Record<string, string | undefined> = {
    starter: process.env.RAZORPAY_STARTER_PLAN_ID,
    professional: process.env.RAZORPAY_PROFESSIONAL_PLAN_ID,
    business: process.env.RAZORPAY_BUSINESS_PLAN_ID
  };

  const id = planMap[planType];
  if (!id) {
    throw new Error(`Razorpay Plan ID for "${planType}" is not configured in your environment variables. Please check settings.`);
  }

  return id;
}

/**
 * Logs safe diagnostic summaries to prevent printing full Razorpay Secrets in log collectors.
 */
export function logSafeDiagnosticError(endpoint: string, err: any) {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const isTest = keyId.startsWith('rzp_test_');
  const environment = isTest ? 'TEST' : (keyId.startsWith('rzp_live_') ? 'LIVE' : 'UNKNOWN');
  const prefix = keyId ? keyId.substring(0, 8) + '****' : 'MISSING';
  const status = err.statusCode || 500;
  const description = err.error && typeof err.error === 'object'
    ? (err.error.description || JSON.stringify(err.error))
    : (err.error || err.message || JSON.stringify(err));

  console.error(`[Razorpay Debug Summary]`);
  console.error(`Razorpay environment: ${environment}`);
  console.error(`Key ID: ${prefix}`);
  console.error(`Endpoint: ${endpoint}`);
  console.error(`Status: ${status}`);
  console.error(`Error: ${description}`);
}
