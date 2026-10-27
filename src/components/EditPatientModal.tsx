import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  updatePatientDemographics,
  getPatientByCode,
  convertArabicToEnglishDigits,
} from '../lib/patientsService';
import { Patient } from '../types';
import { X, Save, AlertCircle, Pencil } from 'lucide-react';

export interface EditedPatientData {
  code: number;
  name: string;
  age: string;
  phone: string;
  address: string;
}

interface EditPatientModalProps {
  patient: Patient;
  onClose: () => void;
  onSaved: (patientId: string, updated: EditedPatientData) => void;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  patient,
  onClose,
  onSaved,
}) => {
  const { t, language } = useLanguage();
  const { userProfile } = useAuth();

  // Demographics (بيانات العميل الأساسية)
  const [code, setCode] = useState(
    patient.code !== undefined && patient.code !== null ? String(patient.code) : ''
  );
  const [name, setName] = useState(patient.name || '');
  const [age, setAge] = useState(patient.age || '');
  const [phone, setPhone] = useState(patient.phone || '');
  const [address, setAddress] = useState(patient.address || '');

  // Duplicate file-code guard (another patient already using the typed code)
  const [duplicatePatient, setDuplicatePatient] = useState<Patient | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCodeChange = async (val: string) => {
    setCode(val);
    setDuplicatePatient(null);
    const clean = convertArabicToEnglishDigits(val).replace(/^#/, '').trim();
    // Keeping the patient's current code unchanged is always fine
    if (clean && clean === String(patient.code)) {
      return;
    }
    if (clean && !isNaN(Number(clean))) {
      setCheckingCode(true);
      try {
        const found = await getPatientByCode(clean);
        // Ignore the patient being edited (keeping his own code is fine)
        setDuplicatePatient(found && found.id !== patient.id ? found : null);
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingCode(false);
      }
    }
  };

  const handleSave = async () => {
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg(t('اسم المريض مطلوب (الإسم /)'));
      return;
    }
    if (!phone.trim()) {
      setErrorMsg(t('رقم الهاتف مطلوب (ت :)'));
      return;
    }
    if (duplicatePatient) {
      setErrorMsg(
        language === 'en'
          ? `File number #${code} is already assigned to ${duplicatePatient.name}. Choose another number.`
          : `رقم الملف #${code} مستخدم بالفعل للمريض: ${duplicatePatient.name}. اختر رقمًا آخر`
      );
      return;
    }
    if (!userProfile) return;

    const cleanCode = convertArabicToEnglishDigits(code).replace(/^#/, '').trim();
    const codeNum = Number(cleanCode);

    setLoading(true);
    try {
      await updatePatientDemographics(
        patient.id,
        {
          code: cleanCode || undefined,
          name: name.trim(),
          age: age.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        userProfile
      );

      onSaved(patient.id, {
        code: !isNaN(codeNum) && codeNum > 0 ? codeNum : patient.code,
        name: name.trim(),
        age: age.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t('حدث خطأ أثناء حفظ تعديلات المريض'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-stone-300 overflow-hidden my-4 max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-100 border-b border-stone-300 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-800 text-white rounded-lg">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900">
                {t("تعديل بيانات المريض")}
              </h3>
              <span className="text-xs text-stone-500 font-mono">
                #{patient.code} • {patient.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            title={t("إغلاق")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {duplicatePatient && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                {language === 'en' ? `File number #${code} is already registered to ` : `رقم الملف #${code} مسجل بالفعل للمريض `}
                <span className="font-black underline">{duplicatePatient.name}</span>
                {language === 'en' ? ' — duplicate numbers are not allowed. Choose another number.' : ' — لا يمكن حفظ رقم مكرر، اختر رقمًا آخر.'}
              </span>
            </div>
          )}

          {/* رقم الملف + الاسم */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t("الرقم :")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder={t("رقم الملف...")}
                  className={`w-full px-2.5 py-2 border-2 rounded-lg font-mono font-bold text-sm text-center focus:outline-none focus:bg-white ${
                    duplicatePatient
                      ? 'border-rose-500 bg-rose-50/60 text-rose-900'
                      : 'border-teal-700 bg-teal-50/60 text-teal-950 focus:border-teal-900'
                  }`}
                  title={t("رقم ملف المريض")}
                />
                {checkingCode && (
                  <span className="absolute left-1.5 top-2.5 text-[10px] text-teal-600">...</span>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t("الإسم /")} <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("اسم المريض ثلاثي أو رباعي...")}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white bg-stone-50/50"
              />
            </div>
          </div>

          {/* السن + الهاتف */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t("السن :")}
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t("مثال: 34 سنة")}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white bg-stone-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t("ت :")} <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                dir="ltr"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono text-right text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white bg-stone-50/50"
              />
            </div>
          </div>

          {/* العنوان */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              {t("العنوان :")}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("المدينة / المنطقة...")}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white bg-stone-50/50"
            />
          </div>

          <p className="text-[11px] text-stone-500 leading-relaxed">
            {t('هذه النافذة لتعديل البيانات الأساسية للمريض. لتعديل البيانات الطبية (الشكوى، التشخيص، الروشتة R/) افتح ملف المريض وعدّل الاستمارة ثم اضغط «حفظ التعديلات».')}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-100 border-t border-stone-300 p-3 sm:p-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            {t("إلغاء")}
          </button>

          <button
            type="button"
            disabled={loading || !!duplicatePatient}
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t('جاري الحفظ...') : t('حفظ التعديلات')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
