import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Patient, FollowupVisit } from '../types';
import {
  updatePatientDemographics,
  updatePatientClinical,
  updatePatientStatus,
  addFollowupVisit,
  listenToFollowups,
  getPatientById,
} from '../lib/patientsService';
import { PrescriptionPrintModal } from './PrescriptionPrintModal';
import {
  ArrowRight,
  Save,
  Send,
  CheckCircle,
  Clock,
  Printer,
  PlusCircle,
  FileText,
  User,
  History,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface PatientPageProps {
  patientId: string;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PatientPage: React.FC<PatientPageProps> = ({
  patientId,
  onBack,
  showToast,
}) => {
  const { userProfile, activeRole } = useAuth();
  const isDoctor = activeRole === 'doctor';

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFile, setSavingFile] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Demographics state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Clinical state
  const [co, setCo] = useState('');
  const [oe, setOe] = useState('');
  const [investigation, setInvestigation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [rx, setRx] = useState('');

  // Follow-ups state
  const [followups, setFollowups] = useState<FollowupVisit[]>([]);
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [followupNotes, setFollowupNotes] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);

  // Prescription Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch Patient
  const loadPatient = async () => {
    try {
      setLoading(true);
      const data = await getPatientById(patientId);
      if (data) {
        setPatient(data);
        setCode(data.code !== undefined && data.code !== null ? String(data.code) : '');
        setName(data.name || '');
        setAge(data.age || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');

        setCo(data.co || '');
        setOe(data.oe || '');
        setInvestigation(data.investigation || '');
        setDiagnosis(data.diagnosis || '');
        setRx(data.rx || '');
      }
    } catch (err: any) {
      console.error(err);
      showToast('تعذر تحميل بيانات المريض', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  // Listen to follow-ups
  useEffect(() => {
    const unsubscribe = listenToFollowups(
      patientId,
      (list) => {
        setFollowups(list);
      },
      (err) => {
        console.error('Followups error:', err);
      }
    );
    return () => unsubscribe();
  }, [patientId]);

  // Save All File Edits
  const handleSaveAll = async () => {
    if (!name.trim()) {
      showToast('اسم المريض مطلوب (الإسم /)', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('رقم الهاتف مطلوب (ت :)', 'error');
      return;
    }
    if (!userProfile) return;

    setSavingFile(true);
    try {
      // 1. Update demographics
      await updatePatientDemographics(
        patientId,
        {
          code: code.trim() || undefined,
          name: name.trim(),
          age: age.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        userProfile
      );

      // 2. If doctor, update clinical fields
      if (isDoctor) {
        await updatePatientClinical(
          patientId,
          { co, oe, investigation, diagnosis, rx },
          userProfile
        );
      }

      showToast('تم حفظ الاستمارة الطبية بنجاح', 'success');
      await loadPatient();
    } catch (err: any) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ الملف', 'error');
    } finally {
      setSavingFile(false);
    }
  };

  // Status transitions
  const handleSendToDoctor = async () => {
    if (!userProfile) return;
    setSavingStatus(true);
    try {
      // Save current edits first
      await updatePatientDemographics(
        patientId,
        {
          name: name.trim(),
          age: age.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        userProfile
      );
      await updatePatientStatus(patientId, 'sent_to_doctor', userProfile);
      showToast('تم إرسال المريض إلى قائمة الانتظار', 'success');
      await loadPatient();
    } catch (err: any) {
      console.error(err);
      showToast('حدث خطأ أثناء إرسال المريض', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleMarkSeen = async () => {
    if (!userProfile) return;
    setSavingStatus(true);
    try {
      // Save clinical changes
      await updatePatientClinical(
        patientId,
        { co, oe, investigation, diagnosis, rx },
        userProfile
      );
      await updatePatientStatus(patientId, 'seen', userProfile);
      showToast('تم الكشف وتسجيل الفحص بنجاح', 'success');
      await loadPatient();
    } catch (err: any) {
      console.error(err);
      showToast('حدث خطأ أثناء تحديث حالة الكشف', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  // Add Followup
  const handleAddFollowup = async (targetStatus: 'sent_to_doctor' | 'seen') => {
    if (!followupNotes.trim()) {
      showToast('يرجى كتابة ملاحظات المتابعة', 'error');
      return;
    }
    if (!userProfile) return;

    setSavingFollowup(true);
    try {
      await addFollowupVisit(
        patientId,
        {
          date: followupDate,
          notes: followupNotes.trim(),
          status: targetStatus,
        },
        userProfile
      );
      setFollowupNotes('');
      setShowAddFollowup(false);
      showToast(
        targetStatus === 'sent_to_doctor'
          ? 'تم تسجيل المتابعة وإرسال المريض لقائمة الانتظار'
          : 'تم تسجيل زيارة المتابعة',
        'success'
      );
      await loadPatient();
    } catch (err: any) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ المتابعة', 'error');
    } finally {
      setSavingFollowup(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-stone-500">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-sm">جاري فتح ملف المريض...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-800">لم يتم العثور على ملف المريض</h3>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Top Floating Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs lg:sticky lg:top-20 z-20">
        <div className="flex items-center gap-2.5 min-w-0 max-w-full">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>

          <span className="font-mono text-sm sm:text-base font-black bg-stone-900 text-white px-2.5 py-1 rounded">
            #{code || patient.code}
          </span>
          <span className="font-bold text-stone-900 text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs">
            {patient.name}
          </span>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {patient.status === 'sent_to_doctor' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              <span>في الانتظار</span>
            </span>
          )}
          {patient.status === 'seen' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
              <span>تم الكشف</span>
            </span>
          )}
          {patient.status === 'with_secretary' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 text-stone-800 text-xs font-bold border border-stone-300">
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>مسجل</span>
            </span>
          )}

          {/* Quick Action: Send to Doctor / Revisit */}
          {patient.status !== 'sent_to_doctor' && (
            <button
              onClick={handleSendToDoctor}
              disabled={savingStatus}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{patient.status === 'seen' ? 'إعادة كشف (إرسال للدكتور)' : 'إرسال للدكتور'}</span>
            </button>
          )}

          {/* Doctor Actions */}
          {isDoctor && (
            <button
              onClick={handleMarkSeen}
              disabled={savingStatus || savingFile}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>تم الكشف</span>
            </button>
          )}

          {/* Print Prescription */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold border border-stone-300 cursor-pointer"
            title="طباعة الروشتة R/"
          >
            <Printer className="w-4 h-4 text-stone-600" />
            <span>طباعة الروشتة</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveAll}
            disabled={savingFile}
            className="flex items-center gap-1 px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingFile ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SHEET 1: CLINICAL RECORD PAPER SHEET (EXACTLY MATCHING PHOTO 2) */}
      {/* ============================================================== */}
      <div className="bg-white p-4 sm:p-8 border-4 border-double border-stone-800 shadow-md text-stone-900 space-y-5">
        
        {/* HEADER SECTION MATCHING THE PHOTO */}
        <div className="border-b-2 border-stone-800 pb-3 space-y-3">
          {/* Row 1: الإسم / & الرقم : */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2 flex items-center gap-2">
              <label className="font-bold text-sm text-stone-900 shrink-0 font-serif">
                الإسم /
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2 py-1 border-b-2 border-stone-400 focus:border-stone-900 focus:outline-none text-sm font-semibold bg-stone-50/50"
              />
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <label className="font-bold text-sm text-stone-900 shrink-0 font-serif">
                الرقم :
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="رقم الملف..."
                className="w-24 px-2 py-0.5 border-b-2 border-stone-400 focus:border-stone-900 focus:outline-none text-sm font-mono font-bold text-center bg-stone-50/50"
                title="رقم ملف المريض"
              />
            </div>
          </div>

          {/* Row 2: السن : & العنوان : & ت : */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
            {/* السن : */}
            <div className="sm:col-span-3 flex items-center gap-2">
              <label className="font-bold text-sm text-stone-900 shrink-0 font-serif">
                السن :
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="مثال: 32 سنة"
                className="w-full px-2 py-1 border-b-2 border-stone-400 focus:border-stone-900 focus:outline-none text-sm bg-stone-50/50"
              />
            </div>

            {/* العنوان : */}
            <div className="sm:col-span-5 flex items-center gap-2">
              <label className="font-bold text-sm text-stone-900 shrink-0 font-serif">
                العنوان :
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="العنوان بالتفصيل..."
                className="w-full px-2 py-1 border-b-2 border-stone-400 focus:border-stone-900 focus:outline-none text-sm bg-stone-50/50"
              />
            </div>

            {/* ت : */}
            <div className="sm:col-span-4 flex items-center gap-2">
              <label className="font-bold text-sm text-stone-900 shrink-0 font-serif">
                ت :
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                dir="ltr"
                className="w-full px-2 py-1 border-b-2 border-stone-400 focus:border-stone-900 focus:outline-none text-sm font-mono text-right bg-stone-50/50"
              />
            </div>
          </div>
        </div>

        {/* CLINICAL FIELDS (C/O, O/E, Investigation, Diagnosis, R/) */}
        <div className="space-y-4 pt-1">
          {/* C/O */}
          <div>
            <label className="block text-sm font-black font-serif text-stone-900 mb-1">
              C/O
            </label>
            <textarea
              rows={3}
              value={co}
              onChange={(e) => setCo(e.target.value)}
              placeholder="شكوى المريض والأعراض (Complaint of)..."
              className="w-full p-2.5 text-sm text-stone-900 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-800 ruled-lines bg-white"
            />
          </div>

          {/* O/E */}
          <div>
            <label className="block text-sm font-black font-serif text-stone-900 mb-1">
              O/E
            </label>
            <textarea
              rows={4}
              value={oe}
              onChange={(e) => setOe(e.target.value)}
              placeholder="الفحص السريري والعلامات الحيوية (On Examination)..."
              className="w-full p-2.5 text-sm text-stone-900 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-800 ruled-lines bg-white"
            />
          </div>

          {/* Investigation */}
          <div>
            <label className="block text-sm font-black font-serif text-stone-900 mb-1">
              Investigation
            </label>
            <textarea
              rows={3}
              value={investigation}
              onChange={(e) => setInvestigation(e.target.value)}
              placeholder="التحاليل والفحوصات والإشاعات المطلوبة ونتائجها..."
              className="w-full p-2.5 text-sm text-stone-900 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-800 ruled-lines bg-white"
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-black font-serif text-stone-900 mb-1">
              Diagnosis
            </label>
            <textarea
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="التشخيص الطبي للحالة..."
              className="w-full p-2.5 text-sm font-semibold text-stone-900 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-800 ruled-lines bg-white"
            />
          </div>

          {/* R/ */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-black font-serif text-stone-900">
                R/
              </label>
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="text-xs text-teal-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الروشتة</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={rx}
              onChange={(e) => setRx(e.target.value)}
              placeholder="الروشتة والعلاج المقترح والجرعات وطريقة الاستخدام..."
              className="w-full p-2.5 text-sm text-stone-900 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-800 ruled-lines bg-white"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 flex flex-wrap gap-3 items-center justify-between text-xs text-stone-500">
          <span>{patient.updatedByName ? `آخر تحديث بواسطة: ${patient.updatedByName}` : ''}</span>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingFile}
            className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            {savingFile ? 'جاري الحفظ...' : 'حفظ الاستمارة'}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SHEET 2: FOLLOW-UP VISITS PAPER SHEET (EXACTLY MATCHING PHOTO 1) */}
      {/* ============================================================== */}
      <div className="bg-white p-4 sm:p-8 border-4 border-double border-stone-800 shadow-md text-stone-900 space-y-4">
        {/* Centered Title as shown in Photo 1 */}
        <div className="border-b-2 border-stone-800 pb-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="min-w-0 sm:flex-1 text-center">
            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-wide text-stone-900">
              Follow - up Visits
            </h2>
          </div>

          {!showAddFollowup && (
            <button
              onClick={() => setShowAddFollowup(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ إضافة متابعة</span>
            </button>
          )}
        </div>

        {/* Add Follow-up Entry Box */}
        {showAddFollowup && (
          <div className="p-4 rounded-xl border-2 border-teal-700 bg-teal-50/20 space-y-3">
            <div className="flex items-center justify-between border-b border-teal-200 pb-2">
              <span className="font-bold text-xs text-teal-950">
                تسجيل زيارة متابعة جديدة
              </span>
              <button
                onClick={() => setShowAddFollowup(false)}
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                إلغاء
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-800 font-serif">
                التاريخ:
              </label>
              <input
                type="date"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="px-2 py-1 bg-white border border-stone-300 rounded text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                ملاحظات المتابعة والكشف:
              </label>
              <textarea
                rows={5}
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                placeholder="اكتب ملاحظات وتطورات الحالة، الضغط، التعديل على العلاج..."
                className="w-full p-3 text-sm text-stone-900 border border-stone-300 rounded-lg ruled-lines bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddFollowup(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingFollowup}
                onClick={() => handleAddFollowup(isDoctor ? 'seen' : 'sent_to_doctor')}
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-bold disabled:opacity-50"
              >
                {savingFollowup ? 'جاري الحفظ...' : 'حفظ المتابعة'}
              </button>
            </div>
          </div>
        )}

        {/* Existing Followup Visits List */}
        {followups.length === 0 ? (
          <div className="p-8 text-center text-stone-400 ruled-lines border border-stone-200 rounded-lg">
            <p className="font-semibold text-sm">لا توجد زيارات متابعة مسجلة حتى الآن</p>
            <p className="text-xs mt-1">اضغط على زر "+ إضافة متابعة" لتسجيل أول استشارة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followups.map((item) => (
              <div
                key={item.id}
                className="border border-stone-300 rounded-xl bg-white overflow-hidden shadow-2xs"
              >
                <div className="bg-stone-100 px-3 py-1.5 border-b border-stone-200 flex flex-wrap gap-2 items-center justify-between text-xs">
                  <span className="font-bold font-mono text-stone-800">
                    التاريخ: {item.date}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.createdByName && (
                      <span className="text-stone-500">
                        بواسطة: {item.createdByName}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {item.status === 'sent_to_doctor' ? 'في الانتظار' : 'تم الكشف'}
                    </span>
                  </div>
                </div>
                <div className="break-words p-3.5 ruled-lines text-sm text-stone-900 whitespace-pre-line leading-relaxed">
                  {item.notes}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription Print Modal */}
      {showPrintModal && (
        <PrescriptionPrintModal
          patient={patient}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
