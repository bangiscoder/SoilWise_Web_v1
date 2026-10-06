import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, isAdmin } from '../lib/firebase';
import { 
  SoilWiseUserProfile, 
  UserRegistrationInput, 
  UserLoginInput,
  UpdateProfileInput 
} from '../types/auth';
import {
  getUserProfile,
  createOrSyncUserProfile,
  updateUserProfileData,
  registerWithEmail as apiRegisterWithEmail,
  loginWithEmail as apiLoginWithEmail,
  loginWithGoogle as apiLoginWithGoogle,
  sendPasswordReset as apiSendPasswordReset,
  logoutUser as apiLogoutUser,
} from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: SoilWiseUserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  loginWithEmail: (input: UserLoginInput) => Promise<void>;
  registerWithEmail: (input: UserRegistrationInput) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (input: UpdateProfileInput) => Promise<SoilWiseUserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<SoilWiseUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load and sync user profile whenever auth state changes
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profile = await createOrSyncUserProfile(firebaseUser);
          setUserProfile(profile);
        } catch (error) {
          console.warn('Error syncing user profile on auth change:', error);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid);
      if (profile) setUserProfile(profile);
    }
  };

  const loginWithEmail = async (input: UserLoginInput) => {
    const { user, profile } = await apiLoginWithEmail(input);
    setCurrentUser(user);
    setUserProfile(profile);
  };

  const registerWithEmail = async (input: UserRegistrationInput) => {
    const { user, profile } = await apiRegisterWithEmail(input);
    setCurrentUser(user);
    setUserProfile(profile);
  };

  const loginWithGoogle = async () => {
    const { user, profile } = await apiLoginWithGoogle();
    setCurrentUser(user);
    setUserProfile(profile);
  };

  const sendPasswordReset = async (email: string) => {
    await apiSendPasswordReset(email);
  };

  const logout = async () => {
    await apiLogoutUser();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateUserProfile = async (input: UpdateProfileInput): Promise<SoilWiseUserProfile> => {
    if (!currentUser) throw new Error('User not authenticated.');
    const updated = await updateUserProfileData(currentUser.uid, input);
    setUserProfile(updated);
    return updated;
  };

  const isUserAdmin = Boolean(currentUser && isAdmin(currentUser));

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        isAdmin: isUserAdmin,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        sendPasswordReset,
        logout,
        refreshProfile,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
