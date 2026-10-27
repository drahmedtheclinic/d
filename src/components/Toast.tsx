import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  const { t } = useLanguage();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-3 sm:right-auto sm:left-4 z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all transform translate-y-0 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-50 border-emerald-700/80'
              : toast.type === 'error'
              ? 'bg-rose-900/90 text-rose-50 border-rose-700/80'
              : 'bg-stone-900/90 text-stone-100 border-stone-700/80'
          }`}
        >
          <div className="min-w-0 flex items-center gap-2.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
            <span className="break-words min-w-0" role="status">{toast.message}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label={t("إغلاق التنبيه")}
            className="shrink-0 p-1 hover:bg-white/10 rounded-lg text-stone-300 hover:text-white transition-colors mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
