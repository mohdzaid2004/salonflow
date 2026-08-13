const path = require('path');
const fs = require('fs');

// Try loading dotenv to support local environment testing
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // Dotenv might not be required if loaded in terminal environment
}

let Razorpay;
try {
  Razorpay = require('razorpay');
} catch (e) {
  console.error("Error: 'razorpay' package is not installed. Run 'npm install razorpay' first.");
  process.exit(1);
}

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("Error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not defined in environment variables or .env file.");
  console.error("Please configure them before running this script.");
  process.exit(1);
}

const instance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

const plansToRegister = [
  { name: 'SalonFlow Starter', price: 499, key: 'STARTER' },
  { name: 'SalonFlow Professional', price: 999, key: 'PROFESSIONAL' },
  { name: 'SalonFlow Business', price: 1999, key: 'BUSINESS' }
];

async function run() {
  const isTest = keyId.startsWith('rzp_test_');
  console.log(`=== Razorpay Plan Registration Script ===`);
  console.log(`Environment Detected: ${isTest ? 'TEST' : 'LIVE'}`);
  console.log(`Key ID Prefix: ${keyId.substring(0, 8)}****`);
  console.log(`=========================================\n`);

  for (const plan of plansToRegister) {
    console.log(`Registering "${plan.name}" (₹${plan.price}/month)...`);
    try {
      const response = await instance.plans.create({
        period: 'monthly',
        interval: 1,
        item: {
          name: plan.name,
          amount: plan.price * 100, // in paise
          currency: 'INR',
          description: `${plan.name} Plan - Monthly Recurring Subscription`
        }
      });
      console.log(`✅ Success!`);
      console.log(`   Plan ID: ${response.id}`);
      console.log(`   Add this to your environment variables:`);
      console.log(`   RAZORPAY_${plan.key}_PLAN_ID=${response.id}\n`);
    } catch (err) {
      console.error(`❌ Failed:`);
      const errorMsg = err.error && typeof err.error === 'object'
        ? (err.error.description || JSON.stringify(err.error))
        : (err.message || JSON.stringify(err));
      console.error(`   Error details: ${errorMsg}\n`);
    }
  }
}

run();
