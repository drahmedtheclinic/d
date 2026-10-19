import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Stethoscope,
  ClipboardList,
  Activity,
  BarChart3,
  FolderOpen,
  Edit2,
  Check,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  queueCount: number;
  currentView: 'records' | 'stats';
  onNavigate: (view: 'records' | 'stats') => void;
  onGoHome: () => void;
  onOpenSeed?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  queueCount,
  currentView,
  onNavigate,
  onGoHome,
}) => {
  const { activeRole, switchRole, userProfile, updateStaffName } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDoctor = activeRole === 'doctor';

  const goHome = () => {
    onNavigate('records');
    onGoHome();
    setIsMenuOpen(false);
  };

  const handleSaveName = () => {
    if (tempName.trim()) updateStaffName(tempName.trim());
    setIsEditingName(false);
  };

  const tabClass = 'min-w-0 min-h-11 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer';

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto w-full min-w-0 px-3 sm:px-6 lg:px-8">
        <div className="min-w-0 xl:flex xl:items-center xl:gap-4">
          {/* A compact, bounded row on phones; navigation lives in the menu. */}
          <div className="flex min-w-0 flex-1 items-center gap-2 py-2">
            <button
              type="button"
              onClick={goHome}
              className="min-w-0 flex flex-1 items-center gap-2 text-right group cursor-pointer"
              aria-label="عيادة دكتور أحمد - الرئيسية"
            >
              <span className="w-9 h-9 shrink-0 rounded-xl bg-teal-700 flex items-center justify-center text-white group-hover:bg-teal-800">
                <Activity className="w-5 h-5" />
              </span>
              <span className="min-w-0 truncate font-bold text-sm sm:text-base text-stone-900 group-hover:text-teal-800">
                عيادة دكتور أحمد
              </span>
            </button>

            <button
              type="button"
              onClick={goHome}
              aria-label={`طابور الانتظار: ${queueCount}`}
              className={`min-w-0 max-w-24 sm:max-w-36 shrink-0 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                queueCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-stone-50 text-stone-600 border-stone-200'
              }`}
            >
              <span className={`shrink-0 rounded-full h-2 w-2 ${queueCount > 0 ? 'bg-amber-600' : 'bg-stone-400'}`} />
              <span className="hidden sm:inline">الانتظار:</span>
              <span className="min-w-0 truncate font-bold font-mono" dir="ltr">{queueCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={isMenuOpen}
              aria-controls="clinic-navigation"
              className="xl:hidden shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 cursor-pointer"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <div
            id="clinic-navigation"
            className={`${isMenuOpen ? 'flex' : 'hidden'} min-w-0 flex-col gap-2 pb-3 xl:flex xl:flex-row xl:items-center xl:pb-0`}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsMenuOpen(false);
                document.querySelector<HTMLButtonElement>('[aria-controls="clinic-navigation"]')?.focus();
              }
            }}
          >
            <nav aria-label="التنقل الرئيسي" className="min-w-0 grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={goHome}
                aria-current={currentView === 'records' ? 'page' : undefined}
                className={`${tabClass} ${currentView === 'records' ? 'bg-white text-teal-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                <FolderOpen className="shrink-0 w-4 h-4" />
                <span className="min-w-0 break-words">السجلات</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('stats');
                  setIsMenuOpen(false);
                }}
                aria-current={currentView === 'stats' ? 'page' : undefined}
                className={`${tabClass} ${currentView === 'stats' ? 'bg-white text-teal-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                <BarChart3 className="shrink-0 w-4 h-4" />
                <span className="min-w-0 break-words">الإحصائيات</span>
              </button>
            </nav>

            <div role="group" aria-label="اختيار الدور" className="min-w-0 grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => {
                  switchRole('secretary');
                  goHome();
                }}
                aria-pressed={!isDoctor}
                className={`${tabClass} ${!isDoctor ? 'bg-sky-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                <ClipboardList className="shrink-0 w-4 h-4" />
                <span className="min-w-0 break-words">المساعدة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  switchRole('doctor');
                  goHome();
                }}
                aria-pressed={isDoctor}
                className={`${tabClass} ${isDoctor ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                <Stethoscope className="shrink-0 w-4 h-4" />
                <span className="min-w-0 break-words">الدكتور</span>
              </button>
            </div>

            <div className="min-w-0 xl:w-36 flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-xl text-xs">
              {isEditingName ? (
                <>
                  <input
                    type="text"
                    aria-label="اسم الموظف"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleSaveName();
                    }}
                    className="min-w-0 w-full flex-1 px-1.5 py-1 bg-white border border-stone-300 rounded text-stone-800"
                    autoFocus
                  />
                  <button type="button" onClick={handleSaveName} aria-label="حفظ الاسم" className="shrink-0 w-9 flex items-center justify-center p-2 bg-teal-600 text-white rounded hover:bg-teal-700">
                    <Check className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate font-semibold text-stone-700" title={userProfile.name}>{userProfile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(userProfile.name);
                      setIsEditingName(true);
                    }}
                    className="shrink-0 w-9 flex items-center justify-center text-stone-500 hover:text-stone-700 p-2"
                    aria-label="تعديل الاسم"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
