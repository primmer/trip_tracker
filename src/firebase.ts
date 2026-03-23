import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
