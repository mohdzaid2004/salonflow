import { NextResponse } from 'next/server';
import { getAdminDb } from '@/services/billing/config';

export async function GET(req: Request) {
  try {
    const db = getAdminDb();
    const salonId = 'n0U824dE1mPzDqgA8Z';
    console.log(`[API Test] Updating customer phone numbers for salon ${salonId}...`);
    
    const customersRef = db.collection(`salons/${salonId}/customers`);
    const snap = await customersRef.get();
    
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { phone: '9108200414' });
    });
    
    await batch.commit();
    console.log(`[API Test] Successfully updated ${snap.size} customer phone numbers.`);

    return NextResponse.json({
      success: true,
      message: `Updated ${snap.size} customer phone numbers to 9108200414.`
    });
  } catch (error: any) {
    console.error('[API Test] Update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
