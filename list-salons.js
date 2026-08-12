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

async function listSalons() {
  try {
    console.log("Listing salons...");
    const snap = await getDocs(collection(db, 'salons'));
    console.log(`Found ${snap.size} salons:`);
    snap.docs.forEach(doc => {
      console.log(`- ID: ${doc.id}, Name: ${doc.data().name}`);
    });
  } catch (e) {
    console.error(e);
  }
}

listSalons();
