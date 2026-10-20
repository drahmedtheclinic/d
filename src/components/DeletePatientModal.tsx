import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { deletePatient, convertArabicToEnglishDigits } from '../lib/patientsService';
import { Patient } from '../types';
import { X, Trash2, AlertTriangle, Phone } from 'lucide-react';

interface DeletePatientModalProps {
  patient: Patient;
  onClose: () => void;
  onDeleted: (patientId: string) => void;
}

export const DeletePatientModal: React.FC<DeletePatientModalProps> = ({
  patient,
  onClose,
  onDeleted,
}) => {
  const { userProfile } = useAuth();

  const [confirmCode, setConfirmCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Safety check: the assistant must type the patient's file code to enable deletion
  const expectedCode =
    patient.code !== undefined && patient.code !== null && String(patient.code).trim() !== ''
      ? String(patient.code).trim()
      : '';

  const typedCode = convertArabicToEnglishDigits(confirmCode).replace(/^#/, '').trim();
  const isConfirmed = expectedCode !== ''
    ? typedCode === expectedCode
    : confirmCode.trim() === 'حذف';

  const handleDelete = async () => {
    if (!isConfirmed || !userProfile) return;

    setErrorMsg('');
    setDeleting(true);
    try {
      await deletePatient(patient.id, userProfile);
      onDeleted(patient.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حذف ملف المريض');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={deleting ? undefined : onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-rose-300 overflow-hidden my-4 max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-700 text-white rounded-lg">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-rose-950">
              حذف ملف المريض
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Patient Summary */}
          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center gap-3">
            <span className="font-mono font-bold text-xs bg-stone-900 text-white px-2.5 py-1 rounded shrink-0">
              #{patient.code}
            </span>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-stone-900 truncate">
                {patient.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                {patient.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-stone-400" />
                    {patient.phone}
                  </span>
                )}
                {patient.age && <span>{patient.age}</span>}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="p-3.5 rounded-xl border-2 border-rose-300 bg-rose-50/60 text-rose-950 space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs sm:text-sm font-black">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>حذف نهائي — لا يمكن التراجع عنه</span>
            </p>
            <ul className="text-xs leading-relaxed list-disc pr-5 space-y-0.5">
              <li>سيتم حذف الاستمارة الطبية بالكامل (التشخيص والروشتة وكل الحقول).</li>
              <li>سيتم حذف جميع زيارات المتابعة الخاصة بهذا المريض أيضًا.</li>
              <li>لن يظهر المريض بعد ذلك في البحث أو القوائم أو طابور الانتظار.</li>
            </ul>
          </div>

          {/* Typed Confirmation */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              {expectedCode !== '' ? (
                <>
                  للتأكيد، اكتب رقم ملف المريض{' '}
                  <span className="font-mono font-black text-rose-700">
                    {expectedCode}
                  </span>{' '}
                  في الحقل التالي:
                </>
              ) : (
                <>للتأكيد، اكتب كلمة «حذف» في الحقل التالي:</>
              )}
            </label>
            <input
              type="text"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              placeholder={expectedCode !== '' ? `مثال: ${expectedCode}` : 'حذف'}
              dir={expectedCode !== '' ? 'ltr' : 'rtl'}
              autoComplete="off"
              className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm font-mono font-bold text-center focus:outline-none focus:bg-white ${
                isConfirmed
                  ? 'border-rose-600 bg-rose-50/60 text-rose-900'
                  : 'border-stone-300 bg-stone-50/50 text-stone-900 focus:border-rose-400'
              }`}
            />
            {confirmCode.trim() !== '' && !isConfirmed && (
              <p className="text-[11px] text-stone-500 mt-1">
                الرقم المدخل غير مطابق لرقم ملف هذا المريض.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-100 border-t border-stone-300 p-3 sm:p-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={!isConfirmed || deleting}
            onClick={handleDelete}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={isConfirmed ? 'حذف المريض نهائيًا' : 'اكتب رقم الملف أولًا لتفعيل الحذف'}
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'جاري الحذف...' : 'حذف نهائيًا'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
