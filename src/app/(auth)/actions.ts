'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';

// This is a server-side action that now uses the Firebase Admin SDK.

// The service account is injected via environment variables on the server.
// It's crucial to parse the JSON string from the environment variable.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

let adminApp: App;
if (!getApps().some(app => app.name === 'admin')) {
  adminApp = initializeApp({
    credential: cert(serviceAccount)
  }, 'admin');
} else {
  adminApp = getApps().find(app => app.name === 'admin')!;
}


const firestore = getFirestore(adminApp);


interface SeedDataPayload {
  userId: string;
  salonName: string;
  phone: string;
  email: string;
}

export async function seedInitialDataForSalon(payload: SeedDataPayload) {
  const {
    userId,
    salonName,
    phone,
    email,
  } = payload;
  const salonId = userId; // Use userId as the unique salonId

  try {
    const batch: WriteBatch = firestore.batch();

    // 1. Create Salon Document
    const salonRef = firestore.collection('salons').doc(salonId);
    batch.set(salonRef, {
      salonId: salonId,
      name: salonName,
      address: "",
      city: "",
      state: "",
      phone: phone,
      logoUrl: '',
      gstNumber: '',
      languageDefault: 'en',
      timezone: 'IST',
      subscriptionPlanId: 'starter',
      billingStatus: 'trial',
      businessHours: '{}', // Empty JSON object
    });

    // 2. Create User (Owner) Document
    const userRef = firestore.collection(`salons/${salonId}/users`).doc(userId);
    batch.set(userRef, {
      userId: userId,
      salonId: salonId,
      name: "Owner",
      role: 'owner',
      phone: phone,
      email: email,
    });

    // 3. Create Sample Staff
    const staffData = [
      {
        name: 'Ravi Kumar',
        specialties: ['Hair', 'Coloring'],
        workingHours: '{}',
        commissionPercent: 20,
      },
      {
        name: 'Priya Sharma',
        specialties: ['Skin', 'Nails'],
        workingHours: '{}',
        commissionPercent: 25,
      },
    ];
    staffData.forEach((staffMember) => {
      const staffRef = firestore.collection(`salons/${salonId}/staff`).doc();
      batch.set(staffRef, { ...staffMember, staffId: staffRef.id, salonId: salonId });
    });

    // 4. Create Sample Customers
    const customerData = [
      { name: 'Aarav Patel', phone: '9876543210', visitHistory: '' },
      { name: 'Diya Mehta', phone: '9123456789', visitHistory: '' },
    ];
    customerData.forEach((customer) => {
      const customerRef = firestore.collection(`salons/${salonId}/customers`).doc();
      batch.set(customerRef, { ...customer, customerId: customerRef.id, salonId: salonId });
    });

    // 5. Create Sample Services
    const serviceData = [
      {
        name: "Men's Haircut",
        duration: 30,
        price: 250,
        gstPercent: 18,
        category: 'Hair',
      },
      {
        name: "Women's Haircut",
        duration: 60,
        price: 500,
        gstPercent: 18,
        category: 'Hair',
      },
      {
        name: 'Classic Manicure',
        duration: 45,
        price: 400,
        gstPercent: 18,
        category: 'Nails',
      },
      {
        name: 'Basic Facial',
        duration: 60,
        price: 800,
        gstPercent: 18,
        category: 'Skin',
      },
    ];
    serviceData.forEach((service) => {
      const serviceRef = firestore.collection(`salons/${salonId}/services`).doc();
      batch.set(serviceRef, { ...service, serviceId: serviceRef.id, salonId: salonId });
    });

    await batch.commit();

    return { success: true, salonId: salonId };
  } catch (error) {
    console.error('Error seeding initial data with Admin SDK:', error);
    // Ensure a clear error is returned to the client
    return { success: false, error: `Failed to set up salon. ${(error as Error).message}` };
  }
}
