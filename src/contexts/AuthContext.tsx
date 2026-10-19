import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, testConnection } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile;
  activeRole: UserRole;
  switchRole: (role: UserRole) => void;
  updateStaffName: (name: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active role stored locally so secretary and doctor can use their view directly
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('clinic_active_role');
    return saved === 'doctor' ? 'doctor' : 'secretary';
  });

  const [doctorName, setDoctorName] = useState(() => {
    return localStorage.getItem('clinic_doctor_name') || 'د. أحمد';
  });

  const [secretaryName, setSecretaryName] = useState(() => {
    return localStorage.getItem('clinic_secretary_name') || 'المساعدة';
  });

  // Test connection & attempt silent anonymous auth if needed by firestore
  useEffect(() => {
    testConnection();

    // Silent anonymous auth so Firestore has an auth UID if rules require it
    try {
      signInAnonymously(auth).catch((err) => {
        // If anonymous auth is not enabled in Firebase Console, that's okay, app works directly
        console.warn('Silent anonymous auth notice:', err.message);
      });
    } catch (_) {}

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const switchRole = (newRole: UserRole) => {
    setActiveRole(newRole);
    localStorage.setItem('clinic_active_role', newRole);
  };

  const updateStaffName = (name: string) => {
    if (activeRole === 'doctor') {
      setDoctorName(name);
      localStorage.setItem('clinic_doctor_name', name);
    } else {
      setSecretaryName(name);
      localStorage.setItem('clinic_secretary_name', name);
    }
  };

  const userProfile: UserProfile = {
    uid: currentUser?.uid || `staff-${activeRole}`,
    name: activeRole === 'doctor' ? doctorName : secretaryName,
    role: activeRole,
    email: `${activeRole}@clinic.local`,
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activeRole,
        switchRole,
        updateStaffName,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
