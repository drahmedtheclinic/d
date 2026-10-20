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
 * Updates patient demographics (Secretary or Doctor) in Realtime Database.
 * Guards against assigning a file code that already belongs to another patient.
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

  let newCodeNum: number | null = null;
  if (data.code !== undefined && data.code !== null && String(data.code).trim() !== '') {
    const converted = convertArabicToEnglishDigits(String(data.code))
      .replace(/^#/, '')
      .trim();
    const num = Number(converted);
    if (!isNaN(num) && num > 0) {
      newCodeNum = num;
      payload.code = num;
      payload.code_str = String(num);
    }
  }

  try {
    // Prevent assigning a file code that belongs to another patient.
    // Only checked when the code actually changes, so editing other fields
    // (phone, address...) never fails because of a pre-existing legacy duplicate.
    if (newCodeNum !== null) {
      const currentSnap = await get(patientRef);
      const currentCode = currentSnap.exists()
        ? Number((currentSnap.val() as Patient).code)
        : NaN;

      if (currentCode !== newCodeNum) {
        const existing = await getPatientByCode(newCodeNum);
        if (existing && existing.id !== patientId) {
          throw new Error(
            `رقم الملف #${newCodeNum} مستخدم بالفعل للمريض: ${existing.name}. اختر رقمًا آخر`
          );
        }
      }
    }

    await update(patientRef, payload);

    // Keep the auto counter ahead of any manually assigned code
    if (newCodeNum !== null) {
      try {
        const counterRef = ref(rtdb, 'counters/patients/current');
        await runTransaction(counterRef, (curr) => {
          const currentNum = typeof curr === 'number' ? curr : 1000;
          return newCodeNum! >= currentNum ? newCodeNum! : currentNum;
        });
      } catch (_) {}
    }
  } catch (error) {
    // Re-throw our own validation errors as-is (Arabic, user-facing)
    if (error instanceof Error && error.message.startsWith('رقم الملف')) {
      throw error;
    }
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
 * Updates clinical fields (Doctor or Secretary) in Realtime Database
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
 * Permanently deletes a patient record and all of its follow-up visits
 * from Realtime Database in a single atomic multi-path update.
 * A minimal audit entry (who deleted which file, and when) is written to
 * `auditLog/patientDeletions` in the same atomic operation so deletions
 * stay traceable. The sequential code counter is intentionally NOT
 * decremented, so a deleted patient's code is never reused automatically.
 */
export async function deletePatient(
  patientId: string,
  user: UserProfile
): Promise<void> {
  if (!patientId) {
    throw new Error('معرّف المريض غير صالح');
  }

  try {
    // Fetch the record first (for the audit entry + existence check)
    const patientSnap = await get(ref(rtdb, `patients/${patientId}`));
    if (!patientSnap.exists()) {
      throw new Error('لم يتم العثور على ملف المريض (ربما حُذف بالفعل)');
    }
    const patientData = patientSnap.val() as Patient;

    // Count follow-up visits that will be removed with the patient
    let followupsCount = 0;
    try {
      const followupsSnap = await get(ref(rtdb, `followups/${patientId}`));
      if (followupsSnap.exists()) {
        const raw = followupsSnap.val();
        followupsCount = raw && typeof raw === 'object' ? Object.keys(raw).length : 0;
      }
    } catch (_) {}

    const auditKey = push(ref(rtdb, 'auditLog/patientDeletions')).key;

    const updates: Record<string, any> = {
      [`patients/${patientId}`]: null,
      [`followups/${patientId}`]: null,
    };

    if (auditKey) {
      updates[`auditLog/patientDeletions/${auditKey}`] = {
        patientId,
        code: patientData.code ?? null,
        name: patientData.name ?? '',
        followupsDeleted: followupsCount,
        deletedBy: user.uid,
        deletedByName: user.name,
        deletedByRole: user.role,
        deletedAt: Date.now(),
      };
    }

    await update(ref(rtdb), updates);
  } catch (error) {
    // Re-throw our own validation errors as-is (Arabic, user-facing)
    if (
      error instanceof Error &&
      (error.message.startsWith('معرّف المريض') ||
        error.message.startsWith('لم يتم العثور'))
    ) {
      throw error;
    }
    handleDatabaseError(error, OperationType.DELETE, `patients/${patientId}`);
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
