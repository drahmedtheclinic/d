import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createPatient, getPatientByCode, convertArabicToEnglishDigits } from '../lib/patientsService';
import { Patient, PatientStatus } from '../types';
import { X, Send, Save, AlertCircle, FileText, Check, Search, ArrowLeft } from 'lucide-react';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patientId: string, status: PatientStatus) => void;
  onOpenPatient?: (patientId: string) => void;
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  onPatientCreated,
  onOpenPatient,
}) => {
  const { userProfile, activeRole } = useAuth();
  const isDoctor = activeRole === 'doctor';

  // Patient Code (manual entry by assistant)
  const [code, setCode] = useState('');
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // Demographics (matching paper header)
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Clinical fields (matching paper body)
  const [co, setCo] = useState('');
  const [oe, setOe] = useState('');
  const [investigation, setInvestigation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [rx, setRx] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCodeChange = async (val: string) => {
    setCode(val);
    setExistingPatient(null);
    const clean = convertArabicToEnglishDigits(val).replace(/^#/, '').trim();
    if (clean && !isNaN(Number(clean))) {
      setCheckingCode(true);
      try {
        const found = await getPatientByCode(clean);
        setExistingPatient(found);
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingCode(false);
      }
    }
  };

  const handleSubmit = async (targetStatus: PatientStatus) => {
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('اسم المريض مطلوب (الإسم /)');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('رقم الهاتف مطلوب (ت :)');
      return;
    }
    if (!userProfile) return;

    setLoading(true);
    try {
      const patientId = await createPatient(
        {
          code: code.trim() || undefined,
          name: name.trim(),
          age: age.trim(),
          address: address.trim(),
          phone: phone.trim(),
          co: co.trim(),
          oe: oe.trim(),
          investigation: investigation.trim(),
          diagnosis: diagnosis.trim(),
          rx: rx.trim(),
          status: targetStatus,
        },
        userProfile
      );

      // Reset form
      setCode('');
      setExistingPatient(null);
      setName('');
      setAge('');
      setPhone('');
      setAddress('');
      setCo('');
      setOe('');
      setInvestigation('');
      setDiagnosis('');
      setRx('');

      onPatientCreated(patientId, targetStatus);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ استمارة المريض');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-stone-300 overflow-hidden my-4 max-h-[95vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="bg-stone-100 border-b border-stone-300 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-800 text-white rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900">
                استمارة مريض جديد
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Paper Container (Styled exactly like the paper photo with double border) */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-stone-50">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Alert if Patient Code Already Exists (Revisit / إعادة) */}
          {existingPatient && (
            <div className="mb-4 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    هذا الرقم مسجل بالفعل للمريض: <span className="underline font-black text-amber-950">{existingPatient.name}</span>
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    الهاتف: {existingPatient.phone || 'غير مسجل'} • كشف سابق: {existingPatient.diagnosis || 'مسجل بالعيادة'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenPatient) {
                    onOpenPatient(existingPatient.id);
                  }
                }}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <span>فتح ملف المريض للإعادة</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Double Rectangular Border Paper Sheet (as seen in the photo) */}
          <div className="bg-white p-4 sm:p-7 border-4 border-double border-stone-800 shadow-sm text-stone-900 space-y-4">
            
            {/* PAPER HEADER SECTION */}
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
                    placeholder="اسم المريض ثلاثي أو رباعي..."
                    className="w-full px-2 py-1.5 border-b-2 border-stone-400 focus:border-stone-900 focus:outline-none text-sm font-semibold bg-stone-50/50"
                  />
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <label className="font-bold text-sm text-stone-900 shrink-0 font-serif">
                    الرقم :
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder="رقم الملف..."
                      className="w-28 px-2 py-1 border-2 border-teal-700 focus:border-teal-900 rounded font-mono font-bold text-sm text-center text-teal-950 bg-teal-50/60 focus:outline-none focus:bg-white"
                      title="تدخله المساعدة (مثال: 101)"
                    />
                    {checkingCode && (
                      <span className="absolute left-1.5 top-2 text-[10px] text-teal-600">...</span>
                    )}
                  </div>
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
                    placeholder="مثال: 34 سنة"
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
                    placeholder="المدينة / المنطقة..."
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

            {/* CLINICAL FIELDS (As shown in the paper photo) */}
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
                  rows={3}
                  value={oe}
                  onChange={(e) => setOe(e.target.value)}
                  placeholder="الفحص السريري والعلامات الحيوية (On Examination: BP, Pulse, Chest, Abdomen...)"
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
                  placeholder="التحاليل والفحوصات المطلوبة والنتائج..."
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
                <label className="block text-base font-black font-serif text-stone-900 mb-1">
                  R/
                </label>
                <textarea
                  rows={4}
                  value={rx}
                  onChange={(e) => setRx(e.target.value)}
                  placeholder="الروشتة والعلاج المقترح والجرعات..."
                  className="w-full p-2.5 text-sm text-stone-900 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-800 ruled-lines bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-100 border-t border-stone-300 p-3 sm:p-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {isDoctor ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit('seen')}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>حفظ الكشف</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit('with_secretary')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit('sent_to_doctor')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>حفظ وإرسال للدكتور</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
