import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Chemin vers le fichier de clé de service
const serviceAccountPath = './dentiste-94b72-firebase-adminsdk-fbsvc-2902b93769.json';

// Initialisation de l'application Firebase Admin
if (!getApps().length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('Firebase Admin SDK initialized');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

// Exporter les services Firebase Admin
export const firebaseAdmin = admin;
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore(); 