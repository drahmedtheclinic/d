import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Patient } from '../types';
import {
  listenToDoctorQueue,
  listenToPatients,
  searchPatients,
  getRecentPatients,
} from '../lib/patientsService';
import {
  Stethoscope,
  Clock,
  Search,
  CheckCircle,
  RefreshCw,
  BellRing,
} from 'lucide-react';

interface DoctorHomeProps {
  onOpenPatient: (patientId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DoctorHome: React.FC<DoctorHomeProps> = ({
  onOpenPatient,
}) => {
  const { t, language } = useLanguage();
  const { userProfile } = useAuth();

  // Live queue state
  const [queue, setQueue] = useState<Patient[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Patient[] | null>(null);

  // Archive / recent patients
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'archive'>('queue');

  // Set up live Firestore onSnapshot listener for doctor queue
  useEffect(() => {
    setQueueLoading(true);
    const unsubscribe = listenToDoctorQueue(
      (patients) => {
        setQueue(patients);
        setQueueLoading(false);
      },
      (err) => {
        console.error('Queue error:', err);
        setQueueLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load recent patients for archive tab
  const loadRecent = async () => {
    setRecentLoading(true);
    try {
      const list = await getRecentPatients(50);
      setRecentPatients(list);
    } catch (err) {
      console.error(err);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'archive') {
      setRecentLoading(true);
      const unsubscribe = listenToPatients(
        50,
        (list) => {
          setRecentPatients(list);
          setRecentLoading(false);
        },
        (err) => {
          console.error(err);
          setRecentLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [activeTab]);

  // Search effect
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPatients(term);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format waiting time in Arabic
  const formatTimeSince = (timestamp: any) => {
    if (language === 'en') {
      if (!timestamp) return 'Just now';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      const hours = Math.floor(diffMin / 60);
      return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    }
    if (!timestamp) return 'الآن';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMin === 0) return 'منذ لحظات';
    if (diffMin === 1) return 'منذ دقيقة';
    if (diffMin === 2) return 'منذ دقيقتين';
    if (diffMin < 11) return `منذ ${diffMin} دقائق`;
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    return `منذ ${diffHours} ساعة`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-700 text-white rounded-lg">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {t("غرفة الكشف الطبي")}
            </h2>
            <span className="text-xs text-stone-500">
              {userProfile?.name}
            </span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {queue.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${queue.length > 0 ? 'bg-amber-500' : 'bg-stone-400'}`}></span>
          </span>
          <span className="text-xs font-bold text-emerald-900">
            {language === 'en' ? `Waiting: ${queue.length}` : `في الانتظار: ${queue.length}`}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("بحث برقم المريض أو بالاسم...")}
            className="w-full pr-10 pl-10 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-3 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              {t("مسح")}
            </button>
          )}
        </div>
        {searching && (
          <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{t("جاري البحث...")}</span>
          </p>
        )}
      </div>

      {/* Main Tabs (Queue vs Archive) when not searching */}
      {searchResults === null && (
        <div className="flex overflow-x-auto border-b border-stone-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`shrink-0 flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'queue'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("طابور الانتظار")}</span>
            {queue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold font-mono">
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`shrink-0 flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'archive'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-stone-500" />
            <span>{t("أرشيف المرضى")}</span>
          </button>
        </div>
      )}

      {/* Search Results Display */}
      {searchResults !== null && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-800">
            {language === 'en' ? `Search results (${searchResults.length})` : `نتائج البحث (${searchResults.length})`}
          </div>

          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs font-semibold">
              {t("لا توجد نتائج مطابقة")}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onOpenPatient(p.id)}
                  className="p-3.5 hover:bg-stone-50 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 max-w-full">
                    <span className="shrink-0 font-mono font-bold text-xs bg-stone-100 border border-stone-300 text-stone-800 px-2.5 py-1 rounded">
                      #{p.code}
                    </span>
                    <div className="min-w-0 break-words">
                      <h4 className="break-words min-w-0 font-bold text-sm text-stone-900 group-hover:text-emerald-800 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {p.age} • {p.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    {p.status === 'sent_to_doctor' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                        {t("في الانتظار")}
                      </span>
                    )}
                    {p.status === 'seen' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                        {t("تم الكشف")}
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-emerald-700 text-white rounded text-xs font-bold">
                      {t("فتح الملف")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIVE QUEUE VIEW */}
      {searchResults === null && activeTab === 'queue' && (
        <div className="space-y-3">
          {queueLoading ? (
            <div className="p-8 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs">{t("جاري تحديث الانتظار...")}</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-stone-300 text-stone-500">
              <CheckCircle className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="font-bold text-stone-700 text-sm">
                {t("لا يوجد مرضى في الانتظار حالياً")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {queue.map((patient, index) => (
                <div
                  key={patient.id}
                  onClick={() => onOpenPatient(patient.id)}
                  className="bg-white rounded-xl border-2 border-amber-300 hover:border-emerald-600 p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs bg-stone-900 text-white px-2 py-0.5 rounded">
                          #{patient.code}
                        </span>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
                            {t("جديد")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{formatTimeSince(patient.sentToDoctorAt || patient.createdAt)}</span>
                      </div>
                    </div>

                    <h4 className="break-words text-base font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                      {patient.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-stone-500">
                      <span>{language === 'en' ? 'Age:' : 'السن:'} {patient.age || '—'}</span>
                      <span>•</span>
                      <span className="font-mono">{patient.phone}</span>
                    </div>

                    {patient.co && (
                      <div className="mt-2 p-2 bg-stone-50 rounded text-xs text-stone-700 line-clamp-2">
                        <span className="font-bold">C/O: </span>
                        {patient.co}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">
                      {t("اضغط لبدء الكشف")}
                    </span>
                    <button className="flex items-center gap-1 px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{t("بدء الكشف")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ARCHIVE VIEW */}
      {searchResults === null && activeTab === 'archive' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span className="font-bold text-stone-800">
              {language === 'en' ? `Patient archive (${recentPatients.length})` : `أرشيف المرضى (${recentPatients.length})`}
            </span>
            <button
              onClick={loadRecent}
              className="text-stone-500 hover:text-stone-800 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${recentLoading ? 'animate-spin' : ''}`} />
              <span>{t("تحديث")}</span>
            </button>
          </div>

          {recentLoading ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              {t("جاري التحميل...")}
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs font-semibold">
              {t("لا توجد سجلات في الأرشيف")}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onOpenPatient(p.id)}
                  className="p-3.5 hover:bg-stone-50 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 max-w-full">
                    <span className="shrink-0 font-mono font-bold text-xs bg-stone-100 border border-stone-300 text-stone-800 px-2.5 py-1 rounded">
                      #{p.code}
                    </span>
                    <div className="min-w-0 break-words">
                      <h4 className="break-words min-w-0 font-bold text-sm text-stone-900 group-hover:text-emerald-800 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {p.age} • {p.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    {p.status === 'sent_to_doctor' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                        {t("في الانتظار")}
                      </span>
                    )}
                    {p.status === 'seen' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900">
                        {t("تم الكشف")}
                      </span>
                    )}
                    {p.status === 'with_secretary' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700">
                        {t("مسجل")}
                      </span>
                    )}
                    <button className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-xs font-bold">
                      {t("فتح")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
