import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';

let firebaseApp: any = null;
let rtdb: any = null;
let serverAuth: any = null;
let adminApp: any = null;

// Initialize Firebase Admin if environment variables exist
const envProjId = process.env.FIREBASE_PROJECT_ID;
const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const envDbUrl = process.env.FIREBASE_DATABASE_URL;

if (envProjId && envPrivateKey && envClientEmail) {
  try {
    if (!getAdminApps().length) {
      adminApp = initAdminApp({
        credential: cert({
          projectId: envProjId,
          clientEmail: envClientEmail,
          privateKey: envPrivateKey.replace(/\\n/g, '\n'),
        }),
        databaseURL: envDbUrl,
      });
    } else {
      adminApp = getAdminApps()[0];
    }
    console.log('⚡ Firebase Admin SDK initialized with service account credentials');
  } catch (err) {
    console.warn('Firebase Admin SDK init note:', err);
  }
}

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configRaw);

    if (config && config.projectId && config.apiKey) {
      firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
      serverAuth = getAuth(firebaseApp);

      if (config.databaseURL || envDbUrl) {
        try {
          rtdb = getDatabase(firebaseApp, config.databaseURL || envDbUrl);
          console.log('⚡ Firebase Realtime Database initialized:', config.databaseURL || envDbUrl);
        } catch (e) {
          console.error('Realtime Database init error:', e);
        }
      }

      console.log('⚡ Firebase initialized successfully with Project ID:', config.projectId);
    }
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export { firebaseApp, rtdb, serverAuth, adminApp };


