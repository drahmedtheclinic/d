import {
  ref,
  get,
  set,
  update,
  push,
  onValue,
  runTransaction,
} from 'firebase/database';
import { rtdb, handleDatabaseError, OperationType } from './firebase';
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

export function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parsePatientsSnapshot(val: Record<string, any> | null | undefined): Patient[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val).map(([id, data]) => ({
    ...(data as object),
    id,
  })) as Patient[];
}

/**
 * Atomic transaction in Realtime Database to get and increment sequential patient code
 */
export async function getNextPatientCode(): Promise<number> {
  const counterRef = ref(rtdb, 'counters/patients/current');
  try {
    const result = await runTransaction(counterRef, (currentValue) => {
      if (currentValue === null || typeof currentValue !== 'number' || currentValue < 1000) {
        return 1001;
      }
      return currentValue + 1;
    });
    return (result.snapshot.val() as number) || 1001;
  } catch (error) {
    handleDatabaseError(error, OperationType.WRITE, 'counters/patients/current');
  }
}

/**
 * Fetch patient by sequential code number from Realtime Database
 */
export async function getPatientByCode(rawCode: number | string): Promise<Patient | null> {
  const converted =
    typeof rawCode === 'string'
      ? convertArabicToEnglishDigits(rawCode).replace(/^#/, '').trim()
      : rawCode;
  const num = Number(converted);
  if (!num || isNaN(num)) return null;

  try {
    const snap = await get(ref(rtdb, 'patients'));
    if (!snap.exists()) return null;

    const patients = parsePatientsSnapshot(snap.val());
    const found = patients.find(
      (p) => Number(p.code) === num || String(p.code) === String(num)
    );
    return found || null;
  } catch (error) {
    handleDatabaseError(error, OperationType.GET, 'patients');
    return null;
  }
}

/**
 * Creates a new patient record in Realtime Database with a manual code or auto-generated sequential number
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
  const patientsRef = ref(rtdb, 'patients');
  const newPatientRef = push(patientsRef);
  const patientId = newPatientRef.key!;

  try {
    let cleanCodeNum: number | null = null;
    if (
      patientData.code !== undefined &&
      patientData.code !== null &&
      String(patientData.code).trim() !== ''
    ) {
      const converted = convertArabicToEnglishDigits(String(patientData.code))
        .replace(/^#/, '')
        .trim();
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
        const counterRef = ref(rtdb, 'counters/patients/current');
        await runTransaction(counterRef, (curr) => {
          const currentNum = typeof curr === 'number' ? curr : 1000;
          return cleanCodeNum! >= currentNum ? cleanCodeNum! : currentNum;
        });
      } catch (_) {}
    }

    const cleanName = patientData.name.trim();
    const now = Date.now();

    await set(newPatientRef, {
      id: patientId,
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
      sentToDoctorAt: patientData.status === 'sent_to_doctor' ? now : null,
      createdBy: user.uid,
      createdByName: user.name,
      createdAt: now,
      updatedBy: user.uid,
      updatedByName: user.name,
      updatedAt: now,
    });

    return patientId;
  } catch (error) {
    handleDatabaseError(error, OperationType.CREATE, 'patients');
  }
}

/**
 * Updates patient demographics (Secretary or Doctor) in Realtime Database
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
  const patientRef = ref(rtdb, `patients/${patientId}`);
  const cleanName = data.name.trim();

  const payload: Record<string, any> = {
    name: cleanName,
    name_lower: normalizeArabic(cleanName),
    age: data.age.trim(),
    address: data.address.trim(),
    phone: data.phone.trim(),
    updatedBy: user.uid,
    updatedByName: user.name,
    updatedAt: Date.now(),
  };

  if (data.code !== undefined && data.code !== null && String(data.code).trim() !== '') {
    const converted = convertArabicToEnglishDigits(String(data.code))
      .replace(/^#/, '')
      .trim();
    const num = Number(converted);
    if (!isNaN(num) && num > 0) {
      payload.code = num;
      payload.code_str = String(num);
    }
  }

  try {
    await update(patientRef, payload);
  } catch (error) {
    handleDatabaseError(error, OperationType.UPDATE, `patients/${patientId}`);
  }
}

/**
 * Updates patient status (e.g. sent_to_doctor, seen, with_secretary) in Realtime Database
 */
export async function updatePatientStatus(
  patientId: string,
  status: PatientStatus,
  user: UserProfile
): Promise<void> {
  const patientRef = ref(rtdb, `patients/${patientId}`);
  const now = Date.now();
  const updatePayload: Record<string, any> = {
    status,
    updatedBy: user.uid,
    updatedByName: user.name,
    updatedAt: now,
  };

  if (status === 'sent_to_doctor') {
    updatePayload.sentToDoctorAt = now;
  }

  try {
    await update(patientRef, updatePayload);
  } catch (error) {
    handleDatabaseError(error, OperationType.UPDATE, `patients/${patientId}`);
  }
}

/**
 * Updates clinical fields (Doctor only) in Realtime Database
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
  const patientRef = ref(rtdb, `patients/${patientId}`);
  try {
    await update(patientRef, {
      co: clinicalData.co,
      oe: clinicalData.oe,
      investigation: clinicalData.investigation,
      diagnosis: clinicalData.diagnosis,
      rx: clinicalData.rx,
      updatedBy: user.uid,
      updatedByName: user.name,
      updatedAt: Date.now(),
    });
  } catch (error) {
    handleDatabaseError(error, OperationType.UPDATE, `patients/${patientId}`);
  }
}

/**
 * Fetch a single patient by ID from Realtime Database
 */
export async function getPatientById(patientId: string): Promise<Patient | null> {
  const patientRef = ref(rtdb, `patients/${patientId}`);
  try {
    const snap = await get(patientRef);
    if (!snap.exists()) return null;
    return { ...(snap.val() as object), id: patientId } as Patient;
  } catch (error) {
    handleDatabaseError(error, OperationType.GET, `patients/${patientId}`);
  }
}

/**
 * Search patients by code, phone, or Arabic name in Realtime Database
 */
export async function searchPatients(rawQuery: string): Promise<Patient[]> {
  const queryStr = rawQuery.trim();
  if (!queryStr) return [];

  const converted = convertArabicToEnglishDigits(queryStr).replace(/^#/, '').trim();
  const numericCode = Number(converted);
  const normalized = normalizeArabic(queryStr);

  try {
    const snap = await get(ref(rtdb, 'patients'));
    if (!snap.exists()) return [];

    const allPatients = parsePatientsSnapshot(snap.val());

    // Exact code matches first
    const exactCodeMatches: Patient[] = [];
    const otherMatches: Patient[] = [];

    for (const p of allPatients) {
      const isExactCode =
        (!isNaN(numericCode) && numericCode > 0 && Number(p.code) === numericCode) ||
        String(p.code) === converted;

      if (isExactCode) {
        exactCodeMatches.push(p);
        continue;
      }

      const partialCodeMatch = converted && String(p.code || '').includes(converted);
      const phoneMatch =
        p.phone?.includes(queryStr) || (converted && p.phone?.includes(converted));
      const nameMatch =
        p.name?.includes(queryStr) ||
        normalizeArabic(p.name || '').includes(normalized);

      if (partialCodeMatch || phoneMatch || nameMatch) {
        otherMatches.push(p);
      }
    }

    otherMatches.sort((a, b) => (Number(b.code) || 0) - (Number(a.code) || 0));
    return [...exactCodeMatches, ...otherMatches];
  } catch (error) {
    handleDatabaseError(error, OperationType.LIST, 'patients');
    return [];
  }
}

/**
 * Fetch recent patients from Realtime Database
 */
export async function getRecentPatients(limitCount: number = 25): Promise<Patient[]> {
  try {
    const snap = await get(ref(rtdb, 'patients'));
    if (!snap.exists()) return [];

    const list = parsePatientsSnapshot(snap.val());
    list.sort((a, b) => (Number(b.code) || 0) - (Number(a.code) || 0));
    return list.slice(0, limitCount);
  } catch (error) {
    handleDatabaseError(error, OperationType.LIST, 'patients');
  }
}

/**
 * Live listener for all recent patients in Realtime Database
 */
export function listenToPatients(
  limitCount: number = 50,
  onPatientsUpdate: (patients: Patient[]) => void,
  onError?: (error: Error) => void
): () => void {
  const patientsRef = ref(rtdb, 'patients');
  return onValue(
    patientsRef,
    (snapshot) => {
      const list = snapshot.exists() ? parsePatientsSnapshot(snapshot.val()) : [];
      list.sort((a, b) => (Number(b.code) || 0) - (Number(a.code) || 0));
      onPatientsUpdate(list.slice(0, limitCount));
    },
    (error) => {
      if (onError) onError(error);
      console.error('Realtime Database listenToPatients error:', error);
    }
  );
}

/**
 * Live queue for doctor (patients with status sent_to_doctor) in Realtime Database
 */
export function listenToDoctorQueue(
  onQueueUpdate: (patients: Patient[]) => void,
  onError?: (error: Error) => void
): () => void {
  const patientsRef = ref(rtdb, 'patients');

  return onValue(
    patientsRef,
    (snapshot) => {
      const allPatients = snapshot.exists() ? parsePatientsSnapshot(snapshot.val()) : [];
      const queue = allPatients.filter((p) => p.status === 'sent_to_doctor');

      // Sort newest sent to doctor first
      queue.sort((a, b) => {
        const timeA = toMillis(a.sentToDoctorAt) || toMillis(a.createdAt);
        const timeB = toMillis(b.sentToDoctorAt) || toMillis(b.createdAt);
        return timeB - timeA;
      });

      onQueueUpdate(queue);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      console.error('Realtime Database listenToDoctorQueue error:', error);
    }
  );
}

/**
 * Followup Visits: Add visit in Realtime Database
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
  const followupsRef = ref(rtdb, `followups/${patientId}`);
  const newFollowupRef = push(followupsRef);
  const followupId = newFollowupRef.key!;
  const now = Date.now();

  try {
    await set(newFollowupRef, {
      id: followupId,
      patientId,
      date: data.date,
      notes: data.notes,
      status: data.status,
      createdBy: user.uid,
      createdByName: user.name,
      createdAt: now,
    });

    // Update parent patient node's updatedAt and status if sent to doctor
    const patientRef = ref(rtdb, `patients/${patientId}`);
    const updatePatientData: Record<string, any> = {
      updatedBy: user.uid,
      updatedByName: user.name,
      updatedAt: now,
    };

    if (data.status === 'sent_to_doctor') {
      updatePatientData.status = 'sent_to_doctor';
      updatePatientData.sentToDoctorAt = now;
    }

    await update(patientRef, updatePatientData);

    return followupId;
  } catch (error) {
    handleDatabaseError(error, OperationType.CREATE, `followups/${patientId}`);
  }
}

/**
 * Followup Visits: Listen to visits in Realtime Database
 */
export function listenToFollowups(
  patientId: string,
  onUpdate: (followups: FollowupVisit[]) => void,
  onError?: (error: Error) => void
): () => void {
  const followupsRef = ref(rtdb, `followups/${patientId}`);
  return onValue(
    followupsRef,
    (snapshot) => {
      const list: FollowupVisit[] = [];
      if (snapshot.exists()) {
        const raw = snapshot.val() as Record<string, any>;
        for (const [id, item] of Object.entries(raw)) {
          list.push({ ...(item as object), id } as FollowupVisit);
        }
      }
      // Sort newest first
      list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      console.error('Realtime Database listenToFollowups error:', error);
    }
  );
}
