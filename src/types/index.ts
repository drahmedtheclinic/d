export type UserRole = 'secretary' | 'doctor';

export interface UserProfile {
  uid: string;
  name: string;
  role: UserRole;
  email?: string;
  createdAt?: any;
}

export type PatientStatus = 'with_secretary' | 'sent_to_doctor' | 'seen';

export interface Patient {
  id: string;
  code: number;
  name: string;
  name_lower: string;
  age: string;
  address: string;
  phone: string;
  // Clinical fields
  co: string; // C/O - Complaint of
  oe: string; // O/E - On Examination
  investigation: string; // Investigation
  plan: string; // Treatment / management plan
  diagnosis: string; // Diagnosis
  rx: string; // R/ - Prescription & Treatment
  status: PatientStatus;
  sentToDoctorAt?: any;
  createdBy: string;
  createdByName?: string;
  createdAt: any;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: any;
}

export interface FollowupVisit {
  id: string;
  patientId: string;
  date: string;
  notes: string;
  status: 'sent_to_doctor' | 'seen';
  createdBy: string;
  createdByName?: string;
  createdAt: any;
}
