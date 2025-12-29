'use server';

import {
  getFirestore,
  doc,
  writeBatch,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server-init';

// This is a server-side action, but we will use the client SDKs
// appropriately initialized for a server environment.

interface SeedDataPayload {
  userId: string;
  userEmail: string;
  userName: string;
  salonName: string;
  address: string;
  city: string;
  state: string;
  phone: string;
}

export async function seedInitialDataForSalon(payload: SeedDataPayload) {
  const {
    userId,
    userEmail,
    userName,
    salonName,
    address,
    city,
    state,
    phone,
  } = payload;
  const salonId = userId; // Use userId as the unique salonId

  try {
    const { firestore } = initializeFirebase();
    const batch = writeBatch(firestore);

    // 1. Create Salon Document
    const salonRef = doc(firestore, 'salons', salonId);
    batch.set(salonRef, {
      salonId: salonId,
      name: salonName,
      address: address,
      city: city,
      state: state,
      phone: phone,
      logoUrl: '',
      gstNumber: '',
      languageDefault: 'en',
      timezone: 'IST',
      subscriptionPlanId: 'starter',
      billingStatus: 'trial',
      businessHours: '{}', // Empty JSON object
      createdAt: serverTimestamp(),
    });

    // 2. Create User (Owner) Document
    const userRef = doc(firestore, `salons/${salonId}/users`, userId);
    batch.set(userRef, {
      userId: userId,
      salonId: salonId,
      name: userName,
      role: 'owner',
      phone: userEmail, // Using email for phone login initially
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
      // Generate a new ID locally for the batch
      const staffRef = doc(collection(firestore, `salons/${salonId}/staff`));
      batch.set(staffRef, { ...staffMember, staffId: staffRef.id, salonId });
    });

    // 4. Create Sample Customers
    const customerData = [
      { name: 'Aarav Patel', phone: '9876543210', visitHistory: '' },
      { name: 'Diya Mehta', phone: '9123456789', visitHistory: '' },
    ];
    customerData.forEach((customer) => {
      const customerRef = doc(
        collection(firestore, `salons/${salonId}/customers`)
      );
      batch.set(customerRef, { ...customer, customerId: customerRef.id, salonId });
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
      const serviceRef = doc(
        collection(firestore, `salons/${salonId}/services`)
      );
      batch.set(serviceRef, { ...service, serviceId: serviceRef.id, salonId });
    });

    await batch.commit();

    return { success: true, salonId: salonId };
  } catch (error) {
    console.error('Error seeding initial data:', error);
    return { success: false, error: (error as Error).message };
  }
}
