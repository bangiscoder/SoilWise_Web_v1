import React, { useState, useEffect } from 'react';
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
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, AUTHORIZED_ADMIN_EMAIL, isFirebaseConfigured } from '../../lib/firebase';
import { ResetPassword } from './ResetPassword';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToApp: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToApp }) => {
  const [email, setEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [isNewSetup, setIsNewSetup] = useState(false);
  const [activeView, setActiveView] = useState<'login' | 'reset'>('login');
  const [urlOobCode, setUrlOobCode] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Check URL query parameters on mount to automatically open reset view if reset link was clicked
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    
    const mode = searchParams.get('mode') || hashParams.get('mode');
    const oobCode = searchParams.get('oobCode') || hashParams.get('oobCode');

    if (mode === 'resetPassword' || oobCode) {
      setUrlOobCode(oobCode);
      setActiveView('reset');
    }
  }, []);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!auth || !isFirebaseConfigured) {
      setErrorMessage('Firebase Authentication is not configured yet. Please check your setup.');
      return;
    }

    setIsGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        login_hint: AUTHORIZED_ADMIN_EMAIL,
        prompt: 'select_account',
      });

      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      if (!user.email || user.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        await signOut(auth);
        throw new Error(
          `Access denied. ${user.email || 'This account'} is not authorised to access the SoilWise AI administration dashboard.`
        );
      }

      onSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User just closed popup
        setErrorMessage('Sign-in cancelled. Please complete authentication to access the dashboard.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage(
          "Google provider is not enabled in Firebase Console. Please enable 'Google' or 'Email/Password' in Firebase Console > Authentication > Sign-in method."
        );
      } else {
        setErrorMessage(err.message || 'Google authentication failed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Standard or New Setup Email/Password Login Handler
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
        // Attempt initial setup for the provisioned project
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          if (userCredential.user.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
            await signOut(auth);
            throw new Error('Access denied. This account is not authorised to access the SoilWise AI administration dashboard.');
          }
          onSuccess();
          return;
        } catch (createErr: any) {
          // If email is already in use, automatically fall back to sign in!
          if (createErr.code === 'auth/email-already-in-use') {
            try {
              const signInCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
              if (signInCredential.user.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
                await signOut(auth);
                throw new Error('Access denied. This account is not authorised to access the SoilWise AI administration dashboard.');
              }
              onSuccess();
              return;
            } catch (signInErr: any) {
              setIsNewSetup(false);
              if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
                setErrorMessage(
                  'An account for bangiscoder@gmail.com already exists. The password you entered is incorrect. Please try again or click "Forgot password?".'
                );
              } else if (signInErr.code === 'auth/operation-not-allowed') {
                setErrorMessage(
                  "Email/Password sign-in is disabled in Firebase Console. Please click 'Sign In with Google' above, or enable 'Email/Password' in Firebase Console (Authentication > Sign-in method)."
                );
              } else {
                setErrorMessage(signInErr.message || 'Account exists. Please sign in with your password.');
              }
              return;
            }
          }
          throw createErr;
        }
      } else {
        // Standard email/password login
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (userCredential.user.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          await signOut(auth);
          throw new Error('Access denied. This account is not authorised to access the SoilWise AI administration dashboard.');
        }
        onSuccess();
      }
    } catch (err: any) {
      console.error('Admin authentication error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage(
          "Email/Password provider is disabled in Firebase Console. You can sign in immediately using 'Sign In with Google' above, or enable 'Email/Password' in Firebase Console (Authentication > Sign-in method)."
        );
      } else if (err.code === 'auth/email-already-in-use') {
        setIsNewSetup(false);
        setErrorMessage('Account already exists. Please enter your existing password or click "Forgot password?".');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        if (!isNewSetup) {
          setErrorMessage(
            'Invalid credentials. If you forgot your password, click "Forgot password?" below or use "Sign In with Google".'
          );
        } else {
          setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
        }
      } else {
        setErrorMessage(err.message || 'Access denied. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xl">
        {activeView === 'reset' ? (
          <ResetPassword
            onBackToLogin={() => {
              setActiveView('login');
              setErrorMessage(null);
            }}
            initialOobCode={urlOobCode}
          />
        ) : (
          <div className="space-y-6">
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
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="flex-1">{infoMessage}</span>
              </div>
            )}

            {/* Primary Option: Instant Google Sign-In for bangiscoder@gmail.com */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3 px-4 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm rounded-xl border border-stone-300 shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1b4332]" />
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google (bangiscoder@gmail.com)</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-3 text-stone-400 text-xs">or password</span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            {/* Email / Password Form */}
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
                      onClick={() => {
                        setActiveView('reset');
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className="text-[11px] text-[#1b4332] hover:underline font-semibold cursor-pointer"
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
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating with Firebase...</span>
                  </>
                ) : (
                  <span>{isNewSetup ? 'Create Admin Credentials' : 'Sign In with Password'}</span>
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
        )}
      </div>
    </div>
  );
};
