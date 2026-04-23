import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Note: firebase-applet-config.json is created by the system after setup
let firebaseConfig = {};
try {
  // @ts-ignore
  const config = await import('../firebase-applet-config.json');
  firebaseConfig = config.default || config;
} catch (e) {
  console.warn('Firebase config not found');
}

const app = initializeApp(firebaseConfig as any);
export const db = getFirestore(app);
export const auth = getAuth(app);
