'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Minimalist server action to create salon and user documents.

interface CreateSalonInput {
  userId: string;
  salonName: string;
  userEmail: string;
}

// Helper to initialize Firebase Admin SDK.
function initializeAdminApp() {
  const adminApps = getApps().filter(app => app.name === 'firebase-admin');
  if (adminApps.length > 0) {
    return adminApps[0];
  }
  
  // This environment variable is automatically set by Firebase App Hosting.
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

  return initializeApp({
    credential: cert(serviceAccount),
  }, 'firebase-admin');
}


export async function createSalonForUser(input: CreateSalonInput): Promise<{ success: boolean; error?: string }> {
  try {
    const adminApp = initializeAdminApp();
    const db = getFirestore(adminApp);
    const batch = db.batch();

    const { userId, salonName, userEmail } = input;

    // 1. Create the salon document. The salon's ID is the user's UID.
    const salonRef = db.collection('salons').doc(userId);
    batch.set(salonRef, {
      salonId: userId,
      name: salonName,
      // Add other default salon properties here as needed
      address: '',
      city: '',
      state: '',
      phone: '',
      languageDefault: 'en',
      timezone: 'IST',
      subscriptionPlanId: 'free',
      billingStatus: 'trial',
      businessHours: '{}', // Empty JSON object for default
      logoUrl: '',
      gstNumber: '',
    });

    // 2. Create the user document inside the salon's subcollection.
    // This document is what grants the user permission to access the salon.
    const userRef = salonRef.collection('users').doc(userId);
    batch.set(userRef, {
      userId: userId,
      salonId: userId, // Denormalized for security rules
      name: 'Owner', // Default name
      role: 'owner',
      phone: userEmail, // Using email as a placeholder for phone initially
    });

    // Commit the batch
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error creating salon for user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
}
