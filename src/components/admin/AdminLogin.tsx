import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Key, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, AUTHORIZED_ADMIN_EMAIL, isFirebaseConfigured } from '../../lib/firebase';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToApp: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToApp }) => {
  const [email, setEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [isNewSetup, setIsNewSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!auth || !isFirebaseConfigured) {
      setErrorMessage('Firebase Authentication is not configured yet. Please check your setup.');
      return;
    }

    if (email.trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      setErrorMessage('Access denied. This account is not authorised to access the SoilWise AI administration dashboard.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (isNewSetup) {
        // Initial setup for the provisioned project
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (userCredential.user.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          await signOut(auth);
          throw new Error('Access denied. This account is not authorised to access the SoilWise AI administration dashboard.');
        }
        onSuccess();
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (userCredential.user.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          await signOut(auth);
          throw new Error('Access denied. This account is not authorised to access the SoilWise AI administration dashboard.');
        }
        onSuccess();
      }
    } catch (err: any) {
      console.error('Admin authentication error:', err);
      // If user not found, suggest creating credentials
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        if (!isNewSetup) {
          setErrorMessage('Invalid credentials. If this is your first time accessing this newly provisioned Firebase instance, toggle "First-time Admin Setup" below to set your password.');
        } else {
          setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
        }
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Account already exists. Please switch to "Standard Login" and enter your password.');
        setIsNewSetup(false);
      } else {
        setErrorMessage(err.message || 'Access denied. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!auth || !email) return;
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfoMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send reset email.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xl space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to SoilWise AI</span>
          </button>

          <div className="w-10 h-10 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-emerald-300" />
          </div>

          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Administrator Login
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            SoilWise AI Feedback & Validation Management
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
          <p>
            Access is restricted to authorized project administrator: <br />
            <strong className="text-stone-800 font-mono">{AUTHORIZED_ADMIN_EMAIL}</strong>
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-stone-700">
                Password
              </label>
              {!isNewSetup && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[11px] text-[#1b4332] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Firebase...</span>
              </>
            ) : (
              <span>{isNewSetup ? 'Create Admin Credentials' : 'Sign In to Dashboard'}</span>
            )}
          </button>
        </form>

        {/* Toggle between standard login and initial setup */}
        <div className="pt-2 border-t border-stone-200/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsNewSetup(!isNewSetup);
              setErrorMessage(null);
            }}
            className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
          >
            {isNewSetup
              ? 'Already set up? Switch to standard login'
              : 'First-time setup for bangiscoder@gmail.com? Click here'}
          </button>
        </div>
      </div>
    </div>
  );
};
