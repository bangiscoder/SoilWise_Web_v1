/**
 * SoilWise AI Authentication & User Account Types (Stage 1)
 */

export type UserRole = 'user' | 'admin' | 'agronomist';

export type AccountStatus = 'active' | 'suspended';

export interface SoilWiseUserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  authProviders: string[]; // e.g. ['password'], ['google.com']
  accountStatus: AccountStatus;
  createdAt: string; // ISO String or serialized timestamp
  updatedAt: string;
}

export interface UserRegistrationInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface AuthState {
  user: SoilWiseUserProfile | null;
  firebaseUser: import('firebase/auth').User | null;
  isLoading: boolean;
  isAdmin: boolean;
}
