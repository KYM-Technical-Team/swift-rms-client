import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only on client-side
let app: FirebaseApp | undefined;
let messaging: Messaging | undefined;

function initializeFirebase() {
  if (typeof window === 'undefined') return;
  
  // Gracefully guard against missing configuration properties
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
    console.warn('Firebase initialization skipped: Missing required configuration keys (apiKey, projectId, messagingSenderId, or appId). Push notifications are disabled.');
    return;
  }
  
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    // Check if browser supports notifications
    if ('Notification' in window && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.error('Failed to initialize Firebase app or messaging:', error);
  }
}

// Get FCM token for push notifications
export async function getFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  initializeFirebase();
  
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Register our custom service worker first
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Custom SW registered:', swRegistration.scope);

    // Get registration token using our service worker
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { 
      vapidKey,
      serviceWorkerRegistration: swRegistration 
    });
    
    console.log('FCM token obtained');
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: unknown) => void) {
  if (typeof window === 'undefined') return () => {};
  
  initializeFirebase();
  
  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, callback);
}

export { app, messaging, firebaseConfig };
