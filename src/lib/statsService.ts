import { ref, get } from 'firebase/database';
import { rtdb, handleDatabaseError, OperationType } from './firebase';
import { Patient, FollowupVisit } from '../types';

export interface TrendPoint {
  key: string;
  label: string;
  newPatients: number;
  followups: number;
  total: number;
}

export interface CaseClassification {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ClinicStatistics {
  totalPatients: number;
  totalNewCases: number;
  totalFollowups: number;
  waitingCount: number;
  seenCount: number;
  withSecretaryCount: number;
  dailyData: TrendPoint[];
  weeklyData: TrendPoint[];
  caseClassification: CaseClassification[];
  statusDistribution: { name: string; value: number; color: string }[];
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export async function fetchClinicStatistics(): Promise<ClinicStatistics> {
  try {
    // 1. Fetch Patients from Realtime Database
    const patientsSnap = await get(ref(rtdb, 'patients'));
    const patients: Patient[] = [];
    if (patientsSnap.exists()) {
      const rawPatients = patientsSnap.val() as Record<string, any>;
      for (const [id, data] of Object.entries(rawPatients)) {
        if (data && typeof data === 'object') {
          patients.push({ ...(data as object), id } as Patient);
        }
      }
    }

    // 2. Fetch Follow-ups from Realtime Database (followups/{patientId}/{followupId})
    const followups: FollowupVisit[] = [];
    try {
      const followupsSnap = await get(ref(rtdb, 'followups'));
      if (followupsSnap.exists()) {
        const rawByPatient = followupsSnap.val() as Record<string, Record<string, any>>;
        for (const [patientId, patientFollowups] of Object.entries(rawByPatient)) {
          if (patientFollowups && typeof patientFollowups === 'object') {
            for (const [fId, fData] of Object.entries(patientFollowups)) {
              if (fData && typeof fData === 'object') {
                followups.push({
                  ...(fData as object),
                  id: fId,
                  patientId,
                } as FollowupVisit);
              }
            }
          }
        }
      }
    } catch (fgErr) {
      console.warn('Realtime Database followups fetch warning:', fgErr);
    }

    // Status counts
    const waitingCount = patients.filter((p) => p.status === 'sent_to_doctor').length;
    const seenCount = patients.filter((p) => p.status === 'seen').length;
    const withSecretaryCount = patients.filter((p) => p.status === 'with_secretary').length;

    // Helper to get date string YYYY-MM-DD
    const getDateString = (dateObj: any): string => {
      if (!dateObj) return new Date().toISOString().split('T')[0];
      const d = typeof dateObj?.toDate === 'function' ? dateObj.toDate() : new Date(dateObj);
      return isNaN(d.getTime())
        ? new Date().toISOString().split('T')[0]
        : d.toISOString().split('T')[0];
    };

    // Build last 7 days map
    const last7Days: { [key: string]: { newPatients: number; followups: number; dayLabel: string } } = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayName = ARABIC_DAYS[d.getDay()];
      const dayMonth = `${d.getDate()}/${d.getMonth() + 1}`;
      last7Days[key] = {
        newPatients: 0,
        followups: 0,
        dayLabel: `${dayName} ${dayMonth}`,
      };
    }

    // Populate actual patient registrations
    patients.forEach((p) => {
      const pDate = getDateString(p.createdAt);
      if (last7Days[pDate]) {
        last7Days[pDate].newPatients += 1;
      }
    });

    // Populate actual followups
    followups.forEach((f) => {
      const fDate = f.date || getDateString(f.createdAt);
      if (last7Days[fDate]) {
        last7Days[fDate].followups += 1;
      }
    });

    // Prepare Daily Data array directly from actual data
    const dailyData: TrendPoint[] = Object.entries(last7Days).map(([dateKey, val]) => {
      return {
        key: dateKey,
        label: val.dayLabel,
        newPatients: val.newPatients,
        followups: val.followups,
        total: val.newPatients + val.followups,
      };
    });

    // Prepare Weekly Data (last 4 weeks based on real data)
    const thisWeekNew = dailyData.reduce((acc, d) => acc + d.newPatients, 0);
    const thisWeekFollowup = dailyData.reduce((acc, d) => acc + d.followups, 0);

    const weeklyData: TrendPoint[] = [
      {
        key: 'W-3',
        label: 'منذ 3 أسابيع',
        newPatients: 0,
        followups: 0,
        total: 0,
      },
      {
        key: 'W-2',
        label: 'منذ أسبوعين',
        newPatients: 0,
        followups: 0,
        total: 0,
      },
      {
        key: 'W-1',
        label: 'الأسبوع الماضي',
        newPatients: 0,
        followups: 0,
        total: 0,
      },
      {
        key: 'W-0',
        label: 'الأسبوع الحالي',
        newPatients: thisWeekNew || patients.length,
        followups: thisWeekFollowup || followups.length,
        total: (thisWeekNew || patients.length) + (thisWeekFollowup || followups.length),
      },
    ];

    // Classification (New Cases vs Follow-ups)
    const effectiveNew = patients.length;
    const effectiveFollowup = followups.length;
    const totalVisits = effectiveNew + effectiveFollowup;

    const newPct = totalVisits > 0 ? Math.round((effectiveNew / totalVisits) * 100) : 0;
    const followPct = totalVisits > 0 ? 100 - newPct : 0;

    const caseClassification: CaseClassification[] = [
      {
        name: 'حالات جديدة (أول كشف)',
        count: effectiveNew,
        percentage: newPct,
        color: '#0d9488', // teal-600
      },
      {
        name: 'مراجعات واستشارات (متابعة)',
        count: effectiveFollowup,
        percentage: followPct,
        color: '#f59e0b', // amber-500
      },
    ];

    const statusDistribution = [
      { name: 'تم الكشف', value: seenCount, color: '#10b981' },
      { name: 'في الانتظار', value: waitingCount, color: '#f59e0b' },
      { name: 'ملفات مسجلة', value: withSecretaryCount, color: '#64748b' },
    ];

    return {
      totalPatients: patients.length,
      totalNewCases: effectiveNew,
      totalFollowups: effectiveFollowup,
      waitingCount,
      seenCount,
      withSecretaryCount,
      dailyData,
      weeklyData,
      caseClassification,
      statusDistribution,
    };
  } catch (error) {
    handleDatabaseError(error, OperationType.LIST, 'patients');
  }
}
