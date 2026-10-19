import React from 'react';
import { Patient } from '../types';
import { X, Printer, Activity } from 'lucide-react';

interface PrescriptionPrintModalProps {
  patient: Patient | null;
  onClose: () => void;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
  patient,
  onClose,
}) => {
  if (!patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayArabic = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'full',
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-300 overflow-hidden my-4">
        {/* Controls Bar (hidden during printing) */}
        <div className="no-print bg-stone-100 border-b border-stone-200 p-3 sm:p-4 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-stone-700">
            معاينة الروشتة الطبية للطباعة (Prescription R/)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الروشتة الآن</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Medical Prescription Sheet */}
        <div className="p-8 sm:p-12 bg-white text-stone-900 border-8 border-stone-100 paper-card min-h-[500px] flex flex-col justify-between">
          <div>
            {/* Clinic Letterhead */}
            <div className="border-b-2 border-stone-800 pb-4 mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-teal-900">
                  عيادة دكتور أحمد
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 font-semibold">
                  د. أحمد • استشاري الباطنة
                </p>
              </div>
              <div className="text-left flex flex-col items-end">
                <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg mb-1">
                  <Activity className="w-7 h-7" />
                </div>
                <span className="text-xs font-mono font-bold text-stone-700">
                  كود الملف: #{patient.code}
                </span>
              </div>
            </div>

            {/* Patient Demographic Line */}
            <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">اسم المريض:</span>
                <span className="font-bold text-sm text-stone-900">{patient.name}</span>
              </div>
              <div>
                <span className="text-stone-500 block">السن:</span>
                <span className="font-bold text-sm text-stone-900">{patient.age || '—'}</span>
              </div>
              <div>
                <span className="text-stone-500 block">التاريخ:</span>
                <span className="font-bold text-stone-800">{todayArabic}</span>
              </div>
              <div>
                <span className="text-stone-500 block">الهاتف:</span>
                <span className="font-mono font-bold text-stone-800">{patient.phone}</span>
              </div>
            </div>

            {/* Diagnosis (if present) */}
            {patient.diagnosis && (
              <div className="mb-6 p-3 bg-teal-50/50 rounded-lg border border-teal-200">
                <span className="text-xs font-bold text-teal-800 block mb-0.5">
                  التشخيص الطبي (Diagnosis):
                </span>
                <p className="text-sm font-semibold text-stone-800">{patient.diagnosis}</p>
              </div>
            )}

            {/* The Classic R/ Symbol & Prescription Body */}
            <div className="relative pt-2">
              <div className="text-4xl sm:text-5xl font-serif font-black text-teal-800/80 mb-3 select-none">
                ℞
              </div>

              <div className="space-y-3 pl-4 whitespace-pre-line text-sm sm:text-base font-medium text-stone-800 leading-relaxed font-sans">
                {patient.rx ? (
                  patient.rx
                ) : (
                  <span className="text-stone-400 italic">
                    لم يتم كتابة علاج أو روشتة حتى الآن في هذا الملف.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Signature & Clinic address */}
          <div className="border-t-2 border-stone-800 pt-6 mt-12 flex items-end justify-between text-xs text-stone-600">
            <div>
              <p className="font-bold text-stone-800">العنوان: 15 شارع النصر، المعادي، القاهرة</p>
              <p>للحجز والاستفسار: 01012345678 • مواعيد العيادة: يومياً 4 - 10 مساءً</p>
            </div>
            <div className="text-center">
              <span className="text-stone-400 block mb-8">توقيع وختم الطبيب المعالج</span>
              <div className="w-32 border-b border-stone-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
