import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCD51mjAM_nTtoPkKCGkhLWW19vaHmSHiw",
  authDomain: "gotv-player.firebaseapp.com",
  databaseURL: "https://gotv-player-default-rtdb.firebaseio.com",
  projectId: "gotv-player",
  storageBucket: "gotv-player.firebasestorage.app",
  messagingSenderId: "934553809484",
  appId: "1:934553809484:web:42f36affa45cc34333fae9",
  measurementId: "G-HM6MQDFNTB"
};

// Initialize Firebase
export const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Realtime Database
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);
export const db = rtdb;

// Initialize Auth
export const auth = getAuth(app);

// Initialize Analytics safely in browser environments
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore analytics init errors in restricted browsers
    });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null): never {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errInfo: DatabaseErrorInfo = {
    error: rawMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Realtime Database Error: ', JSON.stringify(errInfo));
  if (rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('permission_denied')) {
    throw new Error('رفض الصلاحية من Firebase Realtime Database: تأكد من تفعيل Rules للقراءة والكتابة (.read: true, .write: true)');
  }
  throw new Error(rawMessage || 'حدث خطأ في الاتصال بقاعدة بيانات Firebase Realtime Database');
}

// Keep alias for backward compatibility
export const handleFirestoreError = handleDatabaseError;

export async function testConnection(): Promise<boolean> {
  try {
    await get(ref(rtdb, '.info/connected'));
    return true;
  } catch (error) {
    console.warn('Firebase Realtime Database connection notice:', error);
    return false;
  }
}
