import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { SecretaryHome } from './components/SecretaryHome';
import { DoctorHome } from './components/DoctorHome';
import { PatientPage } from './components/PatientPage';
import { StatsPage } from './components/StatsPage';
import { ToastContainer, ToastMessage } from './components/Toast';
import { listenToDoctorQueue } from './lib/patientsService';
import { LanguageProvider } from './contexts/LanguageContext';

function AppContent() {
  const { activeRole } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<'records' | 'stats'>('records');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Live Queue Count for Navbar indicator
  const [queueCount, setQueueCount] = useState<number>(0);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Subscribe to queue count
  useEffect(() => {
    const unsubscribe = listenToDoctorQueue(
      (patients) => {
        setQueueCount(patients.length);
      },
      (err) => {
        console.error('Navbar queue count error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col selection:bg-teal-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        queueCount={queueCount}
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view === 'stats') {
            setSelectedPatientId(null);
          }
        }}
        onGoHome={() => {
          setSelectedPatientId(null);
          setCurrentView('records');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {selectedPatientId ? (
          <PatientPage
            patientId={selectedPatientId}
            onBack={() => setSelectedPatientId(null)}
            showToast={showToast}
          />
        ) : currentView === 'stats' ? (
          <StatsPage
            onBack={() => setCurrentView('records')}
            showToast={showToast}
          />
        ) : activeRole === 'doctor' ? (
          <DoctorHome
            onOpenPatient={(id) => setSelectedPatientId(id)}
            showToast={showToast}
          />
        ) : (
          <SecretaryHome
            onOpenPatient={(id) => setSelectedPatientId(id)}
            showToast={showToast}
          />
        )}
      </main>

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}
