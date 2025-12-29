// IMPORTANT: This file is only used for server-side operations.
// It initializes a separate instance of the Firebase app for use in Server Actions.
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const SERVER_APP_NAME = 'server-app';

// This function is for server-side use ONLY.
export function initializeFirebase() {
  const existingApp = getApps().find(app => app.name === SERVER_APP_NAME);
  if (existingApp) {
    return getSdks(existingApp);
  }

  const newApp = initializeApp(firebaseConfig, SERVER_APP_NAME);
  return getSdks(newApp);
}

function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}
