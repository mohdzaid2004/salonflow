const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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
const salonId = 'n0U824dE1mPzDqgA8Z';

async function run() {
  try {
    console.log(`Fetching salon doc for ${salonId} using Web SDK...`);
    const snap = await getDoc(doc(db, 'salons', salonId));
    if (!snap.exists()) {
      console.log("Salon not found!");
      return;
    }
    const data = snap.data();
    console.log("Salon Document Fields:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error reading salon:", e);
  }
}

run();
