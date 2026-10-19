import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Patient, PatientStatus, FollowupVisit, UserProfile } from '../types';

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ي/g, 'ى');
}

export function convertArabicToEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/**
 * Atomic transaction to get and increment sequential patient code
 */
export async function getNextPatientCode(): Promise<number> {
  const counterRef = doc(db, 'counters', 'patients');
  try {
    const nextCode = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) {
        const initialCode = 1001;
        transaction.set(counterRef, { current: initialCode });
        return initialCode;
      }
      const newCode = (counterDoc.data().current || 1000) + 1;
      transaction.update(counterRef, { current: newCode });
      return newCode;
    });
    return nextCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'counters/patients');
  }
}

/**
 * Fetch patient by sequential code number
 */
export async function getPatientByCode(rawCode: number | string): Promise<Patient | null> {
  const converted = typeof rawCode === 'string'
    ? convertArabicToEnglishDigits(rawCode).replace(/^#/, '').trim()
    : rawCode;
  const num = Number(converted);
  if (!num || isNaN(num)) return null;
  const patientsCol = collection(db, 'patients');
  try {
    const q = query(patientsCol, where('code', '==', num), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Patient;
    }
    const qStr = query(patientsCol, where('code_str', '==', String(num)), limit(1));
    const snapStr = await getDocs(qStr);
    if (!snapStr.empty) {
      const docSnap = snapStr.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Patient;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'patients');
    return null;
  }
}

/**
 * Creates a new patient record with a manual code or auto-generated sequential number
 */
export async function createPatient(
  patientData: {
    code?: number | string;
    name: string;
    age: string;
    address: string;
    phone: string;
    status: PatientStatus;
    co?: string;
    oe?: string;
    investigation?: string;
    diagnosis?: string;
    rx?: string;
  },
  user: UserProfile
): Promise<string> {
  const patientCol = collection(db, 'patients');
  const newDocRef = doc(patientCol);

  try {
    let cleanCodeNum: number | null = null;
    if (patientData.code !== undefined && patientData.code !== null && String(patientData.code).trim() !== '') {
      const converted = convertArabicToEnglishDigits(String(patientData.code)).replace(/^#/, '').trim();
      const num = Number(converted);
      if (!isNaN(num) && num > 0) {
        cleanCodeNum = num;
      }
    }

    if (!cleanCodeNum) {
      cleanCodeNum = await getNextPatientCode();
    } else {
      // Keep counter ahead of any manually entered code
      try {
        const counterRef = doc(db, 'counters', 'patients');
        await runTransaction(db, async (t) => {
          const cSnap = await t.get(counterRef);
          const curr = cSnap.exists() ? (cSnap.data().current || 1000) : 1000;
          if (cleanCodeNum! >= curr) {
            t.set(counterRef, { current: cleanCodeNum! + 1 }, { merge: true });
          }
        });
      } catch (_) {}
    }

    const cleanName = patientData.name.trim();

    await setDoc(newDocRef, {
      code: cleanCodeNum,
      code_str: String(cleanCodeNum),
      name: cleanName,
      name_lower: normalizeArabic(cleanName),
      age: patientData.age.trim(),
      address: patientData.address.trim(),
      phone: patientData.phone.trim(),
      co: patientData.co ? patientData.co.trim() : '',
      oe: patientData.oe ? patientData.oe.trim() : '',
      investigation: patientData.investigation ? patientData.investigation.trim() : '',
      diagnosis: patientData.diagnosis ? patientData.diagnosis.trim() : '',
      rx: patientData.rx ? patientData.rx.trim() : '',
      status: patientData.status,
      sentToDoctorAt: patientData.status === 'sent_to_doctor' ? serverTimestamp() : null,
      createdBy: user.uid,
      createdByName: user.name,
      createdAt: serverTimestamp(),
      updatedBy: user.uid,
      updatedByName: user.name,
      updatedAt: serverTimestamp(),
    });

    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'patients');
  }
}

/**
 * Updates patient demographics (Secretary or Doctor)
 */
export async function updatePatientDemographics(
  patientId: string,
  data: {
    code?: number | string;
    name: string;
    age: string;
    address: string;
    phone: string;
  },
  user: UserProfile
): Promise<void> {
  const patientRef = doc(db, 'patients', patientId);
  const cleanName = data.name.trim();

  const payload: Record<string, any> = {
    name: cleanName,
    name_lower: normalizeArabic(cleanName),
    age: data.age.trim(),
    address: data.address.trim(),
    phone: data.phone.trim(),
    updatedBy: user.uid,
    updatedByName: user.name,
    updatedAt: serverTimestamp(),
  };

  if (data.code !== undefined && data.code !== null && String(data.code).trim() !== '') {
    const converted = convertArabicToEnglishDigits(String(data.code)).replace(/^#/, '').trim();
    const num = Number(converted);
    if (!isNaN(num) && num > 0) {
      payload.code = num;
      payload.code_str = String(num);
    }
  }

  try {
    await updateDoc(patientRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `patients/${patientId}`);
  }
}

/**
 * Updates patient status (e.g. sent_to_doctor, seen, with_secretary)
 */
export async function updatePatientStatus(
  patientId: string,
  status: PatientStatus,
  user: UserProfile
): Promise<void> {
  const patientRef = doc(db, 'patients', patientId);
  const updatePayload: Record<string, any> = {
    status,
    updatedBy: user.uid,
    updatedByName: user.name,
    updatedAt: serverTimestamp(),
  };

  if (status === 'sent_to_doctor') {
    updatePayload.sentToDoctorAt = serverTimestamp();
  }

  try {
    await updateDoc(patientRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `patients/${patientId}`);
  }
}

/**
 * Updates clinical fields (Doctor only)
 */
export async function updatePatientClinical(
  patientId: string,
  clinicalData: {
    co: string;
    oe: string;
    investigation: string;
    diagnosis: string;
    rx: string;
  },
  user: UserProfile
): Promise<void> {
  const patientRef = doc(db, 'patients', patientId);
  try {
    await updateDoc(patientRef, {
      co: clinicalData.co,
      oe: clinicalData.oe,
      investigation: clinicalData.investigation,
      diagnosis: clinicalData.diagnosis,
      rx: clinicalData.rx,
      updatedBy: user.uid,
      updatedByName: user.name,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `patients/${patientId}`);
  }
}

/**
 * Fetch a single patient by ID
 */
export async function getPatientById(patientId: string): Promise<Patient | null> {
  const patientRef = doc(db, 'patients', patientId);
  try {
    const snap = await getDoc(patientRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Patient;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `patients/${patientId}`);
  }
}

/**
 * Search patients by code (exact) or by name prefix (name_lower)
 */
export async function searchPatients(rawQuery: string): Promise<Patient[]> {
  const queryStr = rawQuery.trim();
  if (!queryStr) return [];

  const patientsCol = collection(db, 'patients');
  const results: Patient[] = [];

  // Check if search query is numeric (e.g. code: 1001, #1001, or ١٠٠١)
  const converted = convertArabicToEnglishDigits(queryStr).replace(/^#/, '').trim();
  const numericCode = Number(converted);
  if (!isNaN(numericCode) && numericCode > 0) {
    try {
      const q = query(patientsCol, where('code', '==', numericCode), limit(5));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() } as Patient);
      });

      // Also check code_str
      if (results.length === 0) {
        const qStr = query(patientsCol, where('code_str', '==', String(numericCode)), limit(5));
        const snapStr = await getDocs(qStr);
        snapStr.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() } as Patient);
        });
      }

      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    }
  }

  // Name prefix search using normalized Arabic
  const normalized = normalizeArabic(queryStr);
  try {
    const q = query(
      patientsCol,
      where('name_lower', '>=', normalized),
      where('name_lower', '<=', normalized + '\uf8ff'),
      limit(20)
    );
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      if (!results.some((r) => r.id === docSnap.id)) {
        results.push({ id: docSnap.id, ...docSnap.data() } as Patient);
      }
    });

    // In-memory fallback check across recent patients by code, phone, or name
    const recentQ = query(patientsCol, limit(100));
    const recentSnap = await getDocs(recentQ);
    recentSnap.forEach((docSnap) => {
      const p = { id: docSnap.id, ...docSnap.data() } as Patient;
      const codeMatch =
        (numericCode > 0 && p.code === numericCode) ||
        String(p.code) === converted ||
        String(p.code || '').includes(converted);
      const phoneMatch =
        p.phone?.includes(queryStr) ||
        (converted && p.phone?.includes(converted));
      const nameMatch =
        p.name?.includes(queryStr) ||
        normalizeArabic(p.name || '').includes(normalized);

      if (codeMatch || phoneMatch || nameMatch) {
        if (!results.some((r) => r.id === p.id)) {
          results.push(p);
        }
      }
    });

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'patients');
    return results;
  }
}

/**
 * Fetch recent patients
 */
export async function getRecentPatients(limitCount: number = 25): Promise<Patient[]> {
  const patientsCol = collection(db, 'patients');
  try {
    const q = query(patientsCol, limit(limitCount));
    const snap = await getDocs(q);
    const list: Patient[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Patient);
    });
    // Sort in memory by code descending
    return list.sort((a, b) => (b.code || 0) - (a.code || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'patients');
  }
}

/**
 * Live queue for doctor (patients with status sent_to_doctor)
 */
export function listenToDoctorQueue(
  onQueueUpdate: (patients: Patient[]) => void,
  onError?: (error: Error) => void
): () => void {
  const patientsCol = collection(db, 'patients');
  const q = query(
    patientsCol,
    where('status', '==', 'sent_to_doctor')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const patients: Patient[] = [];
      snapshot.forEach((docSnap) => {
        patients.push({ id: docSnap.id, ...docSnap.data() } as Patient);
      });
      // Sort newest sent to doctor first
      patients.sort((a, b) => {
        const timeA = a.sentToDoctorAt?.toMillis ? a.sentToDoctorAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const timeB = b.sentToDoctorAt?.toMillis ? b.sentToDoctorAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
      });
      onQueueUpdate(patients);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, 'patients');
    }
  );
}

/**
 * Subcollection Followup Visits: Add visit
 */
export async function addFollowupVisit(
  patientId: string,
  data: {
    date: string;
    notes: string;
    status: 'sent_to_doctor' | 'seen';
  },
  user: UserProfile
): Promise<string> {
  const followupsCol = collection(db, 'patients', patientId, 'followups');
  const newFollowupRef = doc(followupsCol);

  try {
    await setDoc(newFollowupRef, {
      patientId,
      date: data.date,
      notes: data.notes,
      status: data.status,
      createdBy: user.uid,
      createdByName: user.name,
      createdAt: serverTimestamp(),
    });

    // Update parent patient document's updatedAt and status if sent to doctor
    const patientRef = doc(db, 'patients', patientId);
    const updatePatientData: Record<string, any> = {
      updatedBy: user.uid,
      updatedByName: user.name,
      updatedAt: serverTimestamp(),
    };

    if (data.status === 'sent_to_doctor') {
      updatePatientData.status = 'sent_to_doctor';
      updatePatientData.sentToDoctorAt = serverTimestamp();
    }

    await updateDoc(patientRef, updatePatientData);

    return newFollowupRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `patients/${patientId}/followups`);
  }
}

/**
 * Subcollection Followup Visits: Listen to visits
 */
export function listenToFollowups(
  patientId: string,
  onUpdate: (followups: FollowupVisit[]) => void,
  onError?: (error: Error) => void
): () => void {
  const followupsCol = collection(db, 'patients', patientId, 'followups');
  return onSnapshot(
    followupsCol,
    (snapshot) => {
      const list: FollowupVisit[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FollowupVisit);
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `patients/${patientId}/followups`);
    }
  );
}
