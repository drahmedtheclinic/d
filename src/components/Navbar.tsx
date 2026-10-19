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

  const isDoctor = activeRole === 'doctor';

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateStaffName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Clinic Branding */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <div
              onClick={() => {
                onNavigate('records');
                onGoHome();
              }}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-xs group-hover:bg-teal-800 transition-colors">
                <Activity className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-base sm:text-lg text-stone-900 group-hover:text-teal-800 transition-colors">
                عيادة دكتور أحمد
              </h1>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => {
                  onNavigate('records');
                  onGoHome();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'records'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>السجلات</span>
              </button>

              <button
                onClick={() => onNavigate('stats')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'stats'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
                <span>الإحصائيات</span>
              </button>
            </nav>
          </div>

          {/* Right Section: Direct Role Switcher (Doctor vs Assistant) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Queue Indicator */}
            <div
              onClick={() => {
                onNavigate('records');
                onGoHome();
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
                queueCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-stone-50 text-stone-600 border-stone-200'
              }`}
              title="طابور الانتظار"
            >
              <span className="relative flex h-2.5 w-2.5">
                {queueCount > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    queueCount > 0 ? 'bg-amber-600' : 'bg-stone-400'
                  }`}
                ></span>
              </span>
              <span>الانتظار:</span>
              <span className="font-bold font-mono text-stone-900">{queueCount}</span>
            </div>

            {/* Direct Role Switcher (Doctor vs Assistant) */}
            <div className="bg-stone-100 p-1 rounded-xl border border-stone-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  switchRole('secretary');
                  onGoHome();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isDoctor
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>المساعدة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchRole('doctor');
                  onGoHome();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isDoctor
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>الدكتور</span>
              </button>
            </div>

            {/* Staff Name Badge with optional edit */}
            <div className="hidden lg:flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-xl text-xs">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-24 px-1.5 py-0.5 text-xs bg-white border border-stone-300 rounded font-bold text-stone-800 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 bg-teal-600 text-white rounded hover:bg-teal-700"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-stone-700">{userProfile.name}</span>
                  <button
                    onClick={() => {
                      setTempName(userProfile.name);
                      setIsEditingName(true);
                    }}
                    className="text-stone-400 hover:text-stone-600 p-0.5"
                    title="تعديل الاسم"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
