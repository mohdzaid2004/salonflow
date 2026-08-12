const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCVy-H-vO19uK1f92Jp9n2Gf9gT9m9m1",
  authDomain: "salonindia-74cbb.firebaseapp.com",
  projectId: "salonindia-74cbb",
  storageBucket: "salonindia-74cbb.firebasestorage.app",
  messagingSenderId: "160983087596",
  appId: "1:160983087596:web:6f0c60e0a58a74ec41c705",
  measurementId: "G-D2L19P9J2E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const salonId = 'n0U824dE1mPzDqgA8Z';
    const snap = await getDocs(collection(db, `salons/${salonId}/appointments`));
    snap.docs.forEach(doc => {
      const data = doc.data();
      const dateVal = data.date ? (data.date.toDate ? data.date.toDate() : new Date(data.date)) : 'N/A';
      console.log(`Appointment ID: ${doc.id}`);
      console.log(`  Customer: ${data.customerName}`);
      console.log(`  Date: ${dateVal}`);
      console.log(`  Status: ${data.status}`);
    });
  } catch (e) {
    console.error(e);
  }
}

check();
