'use server';

import { getFirestore, doc, writeBatch, serverTimestamp } from "firebase-admin/firestore";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { serviceAccount } from "@/firebase/service-account";

let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({
    credential: {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    },
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
} else {
  adminApp = getApps()[0];
}

const db = getFirestore(adminApp);

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
    const { userId, userEmail, userName, salonName, address, city, state, phone } = payload;
    const salonId = userId; // Use userId as the unique salonId

    try {
        const batch = writeBatch(db);

        // 1. Create Salon Document
        const salonRef = doc(db, 'salons', salonId);
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
        const userRef = doc(db, `salons/${salonId}/users`, userId);
        batch.set(userRef, {
            userId: userId,
            salonId: salonId,
            name: userName,
            role: 'owner',
            phone: userEmail, // Using email for phone login initially
        });

        // 3. Create Sample Staff
        const staffData = [
            { name: 'Ravi Kumar', specialties: ['Hair', 'Coloring'], workingHours: '{}', commissionPercent: 20 },
            { name: 'Priya Sharma', specialties: ['Skin', 'Nails'], workingHours: '{}', commissionPercent: 25 },
        ];
        staffData.forEach(staffMember => {
            const staffId = doc(db, `salons/${salonId}/staff`, 'temp-id').id;
            const staffRef = doc(db, `salons/${salonId}/staff`, staffId);
            batch.set(staffRef, { ...staffMember, staffId, salonId });
        });

        // 4. Create Sample Customers
        const customerData = [
            { name: 'Aarav Patel', phone: '+919876543210', visitHistory: '' },
            { name: 'Diya Mehta', phone: '+919123456789', visitHistory: '' },
        ];
        customerData.forEach(customer => {
            const customerId = doc(db, `salons/${salonId}/customers`, 'temp-id').id;
            const customerRef = doc(db, `salons/${salonId}/customers`, customerId);
            batch.set(customerRef, { ...customer, customerId, salonId });
        });

        // 5. Create Sample Services
        const serviceData = [
            { name: 'Men\'s Haircut', duration: 30, price: 250, gstPercent: 18, category: 'Hair' },
            { name: 'Women\'s Haircut', duration: 60, price: 500, gstPercent: 18, category: 'Hair' },
            { name: 'Classic Manicure', duration: 45, price: 400, gstPercent: 18, category: 'Nails' },
            { name: 'Basic Facial', duration: 60, price: 800, gstPercent: 18, category: 'Skin' },
        ];
        serviceData.forEach(service => {
            const serviceId = doc(db, `salons/${salonId}/services`, 'temp-id').id;
            const serviceRef = doc(db, `salons/${salonId}/services`, serviceId);
            batch.set(serviceRef, { ...service, serviceId, salonId });
        });

        await batch.commit();

        return { success: true, salonId: salonId };
    } catch (error) {
        console.error("Error seeding initial data:", error);
        return { success: false, error: (error as Error).message };
    }
}
