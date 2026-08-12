const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({
  projectId: 'salonindia-74cbb',
  storageBucket: 'salonindia-74cbb.firebasestorage.app'
});

const db = getFirestore();
const salonId = 'n0U824dE1mPzDqgA8Z';

async function run() {
  try {
    console.log(`Fetching salon doc for ${salonId}...`);
    const snap = await db.doc(`salons/${salonId}`).get();
    if (!snap.exists) {
      console.log("Salon not found!");
      return;
    }
    const data = snap.data();
    console.log("Salon Document Fields:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

run();
