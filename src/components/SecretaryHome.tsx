import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Patient, PatientStatus } from '../types';
import {
  searchPatients,
  getRecentPatients,
  listenToPatients,
  updatePatientStatus,
} from '../lib/patientsService';
import { PatientFormModal } from './PatientFormModal';
import { EditPatientModal, EditedPatientData } from './EditPatientModal';
import { DeletePatientModal } from './DeletePatientModal';
import {
  Search,
  UserPlus,
  Phone,
  User,
  Clock,
  CheckCircle,
  Send,
  RefreshCw,
  FolderOpen,
  Pencil,
  Trash2,
} from 'lucide-react';

interface SecretaryHomeProps {
  onOpenPatient: (patientId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SecretaryHome: React.FC<SecretaryHomeProps> = ({
  onOpenPatient,
  showToast,
}) => {
  const { userProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Patient[] | null>(null);

  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'all' | PatientStatus>('all');
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  // Edit / Delete patient (secretary)
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  // Load recent patients
  const loadRecent = async () => {
    setLoadingRecent(true);
    try {
      const list = await getRecentPatients(50);
      setRecentPatients(list);
    } catch (err) {
      console.error(err);
      showToast('تعذر تحميل القائمة', 'error');
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    setLoadingRecent(true);
    const unsubscribe = listenToPatients(
      50,
      (list) => {
        setRecentPatients(list);
        setLoadingRecent(false);
      },
      (err) => {
        console.error(err);
        setLoadingRecent(false);
        showToast('تعذر الاتصال بـ Realtime Database: تأكد من تفعيل صلاحيات القراءة والكتابة في Rules', 'error');
      }
    );
    return () => unsubscribe();
  }, []);

  // Search handler
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

  // Quick send to doctor from list
  const handleQuickSend = async (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile) return;

    try {
      await updatePatientStatus(patient.id, 'sent_to_doctor', userProfile);
      showToast(`تم إرسال المريض #${patient.code} إلى الدكتور`, 'success');
      await loadRecent();
      if (searchResults) {
        setSearchResults((prev) =>
          prev ? prev.map((p) => (p.id === patient.id ? { ...p, status: 'sent_to_doctor' } : p)) : null
        );
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء إرسال المريض', 'error');
    }
  };

  // After editing a patient's data from the list
  const handlePatientEdited = (patientId: string, updated: EditedPatientData) => {
    const applyEdit = (list: Patient[]) =>
      list.map((p) => (p.id === patientId ? { ...p, ...updated } : p));

    setRecentPatients((prev) => applyEdit(prev));
    setSearchResults((prev) => (prev ? applyEdit(prev) : null));
    showToast(`تم حفظ تعديلات المريض #${updated.code} (${updated.name})`, 'success');
  };

  // After permanently deleting a patient from the list
  const handlePatientDeleted = (patientId: string) => {
    const deletedCode = patientToDelete?.code;
    const deletedName = patientToDelete?.name;

    setRecentPatients((prev) => prev.filter((p) => p.id !== patientId));
    setSearchResults((prev) => (prev ? prev.filter((p) => p.id !== patientId) : null));
    showToast(
      deletedCode !== undefined
        ? `تم حذف ملف المريض #${deletedCode} (${deletedName}) نهائيًا`
        : 'تم حذف ملف المريض نهائيًا',
      'success'
    );
  };

  // Filtered patients for the main view
  const displayList = searchResults !== null
    ? searchResults
    : statusFilter === 'all'
    ? recentPatients
    : recentPatients.filter((p) => p.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Action Header */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            سجلات واستقبال المرضى
          </h2>
          <span className="text-xs text-stone-500">
            المساعدة: {userProfile?.name}
          </span>
        </div>

        <button
          onClick={() => setIsNewPatientModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>مريض جديد (+ استمارة)</span>
        </button>
      </div>

      {/* Search Bar - Code or Name */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="اكتب رقم المريض (للإعادة) أو الاسم أو رقم الهاتف..."
            className="w-full pr-10 pl-10 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-3 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              مسح
            </button>
          )}
        </div>
        {searching && (
          <p className="text-xs text-teal-700 mt-2 font-medium flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>جاري البحث...</span>
          </p>
        )}
      </div>

      {/* Filter Tabs (when not searching) */}
      {searchResults === null && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              الكل ({recentPatients.length})
            </button>
            <button
              onClick={() => setStatusFilter('sent_to_doctor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                statusFilter === 'sent_to_doctor'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-amber-50 border border-stone-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>في الانتظار ({recentPatients.filter(p => p.status === 'sent_to_doctor').length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('seen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                statusFilter === 'seen'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-emerald-50 border border-stone-200'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              <span>تم الكشف ({recentPatients.filter(p => p.status === 'seen').length})</span>
            </button>
          </div>

          <button
            onClick={loadRecent}
            disabled={loadingRecent}
            className="p-1.5 text-stone-500 hover:text-stone-800 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer"
            title="تحديث"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRecent ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Results / List Section */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <span className="font-bold text-stone-800">
            {searchResults !== null
              ? `نتائج البحث (${searchResults.length})`
              : `سجلات المرضى (${displayList.length})`}
          </span>
        </div>

        {loadingRecent ? (
          <div className="p-8 text-center text-stone-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-xs">جاري التحميل...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-8 text-center text-stone-500 space-y-2">
            <FolderOpen className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="font-bold text-stone-700 text-sm">لا توجد سجلات</p>
            {searchResults === null && (
              <button
                onClick={() => setIsNewPatientModalOpen(true)}
                className="mt-2 px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة مريض جديد</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {displayList.map((p) => (
              <div
                key={p.id}
                onClick={() => onOpenPatient(p.id)}
                className="p-3.5 sm:p-4 hover:bg-stone-50 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
              >
                {/* Patient Primary Details */}
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs bg-stone-100 border border-stone-300 text-stone-800 px-2.5 py-1 rounded">
                    #{p.code}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-stone-900 group-hover:text-teal-800 transition-colors">
                        {p.name}
                      </h4>
                      {p.age && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          {p.age}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-stone-400" />
                        {p.phone}
                      </span>
                      {p.address && (
                        <span className="truncate max-w-[180px]">
                          {p.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                  {p.status === 'sent_to_doctor' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>في الانتظار</span>
                    </span>
                  )}
                  {p.status === 'seen' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>تم الكشف</span>
                    </span>
                  )}
                  {p.status === 'with_secretary' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700">
                      <User className="w-3 h-3 text-stone-500" />
                      <span>مسجل</span>
                    </span>
                  )}

                  {/* Send to doctor / Revisit button */}
                  {p.status === 'seen' ? (
                    <button
                      onClick={(e) => handleQuickSend(p, e)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded text-xs font-bold border border-amber-300 cursor-pointer"
                      title="إرسال المريض لإعادة الكشف"
                    >
                      <Send className="w-3 h-3 text-amber-700" />
                      <span>إعادة كشف</span>
                    </button>
                  ) : p.status !== 'sent_to_doctor' ? (
                    <button
                      onClick={(e) => handleQuickSend(p, e)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded text-xs font-bold border border-amber-300 cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-amber-700" />
                      <span>إرسال للدكتور</span>
                    </button>
                  ) : null}

                  {/* Edit patient data (secretary) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPatientToEdit(p);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded text-xs font-bold border border-teal-300 cursor-pointer"
                    title="تعديل بيانات المريض (الاسم، الهاتف، السن، العنوان، الرقم)"
                  >
                    <Pencil className="w-3 h-3 text-teal-700" />
                    <span>تعديل</span>
                  </button>

                  {/* Delete patient record (secretary) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPatientToDelete(p);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded text-xs font-bold border border-rose-300 cursor-pointer"
                    title="حذف ملف المريض نهائيًا"
                  >
                    <Trash2 className="w-3 h-3 text-rose-700" />
                    <span>حذف</span>
                  </button>

                  <button
                    onClick={() => onOpenPatient(p.id)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-xs font-bold"
                  >
                    فتح
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Patient Modal (secretary) */}
      {patientToEdit && (
        <EditPatientModal
          key={patientToEdit.id}
          patient={patientToEdit}
          onClose={() => setPatientToEdit(null)}
          onSaved={handlePatientEdited}
        />
      )}

      {/* Delete Patient Confirmation Modal (secretary) */}
      {patientToDelete && (
        <DeletePatientModal
          key={patientToDelete.id}
          patient={patientToDelete}
          onClose={() => setPatientToDelete(null)}
          onDeleted={handlePatientDeleted}
        />
      )}

      {/* Patient Form Modal */}
      <PatientFormModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onOpenPatient={onOpenPatient}
        onPatientCreated={(patientId, targetStatus) => {
          showToast(
            targetStatus === 'sent_to_doctor'
              ? 'تم تسجيل المريض وإرساله لقائمة الانتظار'
              : 'تم تسجيل ملف المريض',
            'success'
          );
          loadRecent();
          onOpenPatient(patientId);
        }}
      />
    </div>
  );
};
