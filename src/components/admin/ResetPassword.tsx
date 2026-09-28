import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Key, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { 
  sendPasswordResetEmail, 
  verifyPasswordResetCode, 
  confirmPasswordReset 
} from 'firebase/auth';
import { auth, AUTHORIZED_ADMIN_EMAIL, isFirebaseConfigured } from '../../lib/firebase';

interface ResetPasswordProps {
  onBackToLogin: () => void;
  initialOobCode?: string | null;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ 
  onBackToLogin, 
  initialOobCode 
}) => {
  // Action code from URL params or manual entry
  const [oobCode, setOobCode] = useState<string | null>(initialOobCode || null);
  const [resetEmail, setResetEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  
  // View mode: 'request' (send email) | 'verify' (entering new password) | 'manual-code' | 'success'
  const [viewMode, setViewMode] = useState<'request' | 'verify' | 'manual-code' | 'success'>(
    initialOobCode ? 'verify' : 'request'
  );

  // Verification state
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState<boolean | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Extract oobCode from URL query parameters if not passed directly
  useEffect(() => {
    if (!oobCode) {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
      
      const codeFromUrl = searchParams.get('oobCode') || hashParams.get('oobCode');
      const modeFromUrl = searchParams.get('mode') || hashParams.get('mode');

      if (codeFromUrl && (!modeFromUrl || modeFromUrl === 'resetPassword')) {
        setOobCode(codeFromUrl);
        setViewMode('verify');
      }
    }
  }, [oobCode]);

  // When oobCode is available, verify it with Firebase Auth
  useEffect(() => {
    if (oobCode && viewMode === 'verify') {
      verifyCode(oobCode);
    }
  }, [oobCode, viewMode]);

  const verifyCode = async (codeToVerify: string) => {
    if (!auth || !isFirebaseConfigured) {
      setErrorMessage('Firebase Authentication is not configured yet.');
      return;
    }

    setIsVerifyingCode(true);
    setErrorMessage(null);

    try {
      const emailFromCode = await verifyPasswordResetCode(auth, codeToVerify);
      setVerifiedEmail(emailFromCode);
      setIsCodeValid(true);
    } catch (err: any) {
      console.error('verifyPasswordResetCode error:', err);
      setIsCodeValid(false);
      setErrorMessage(
        'This password reset link is no longer valid. Please request a new reset link.'
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 1. Send password reset email
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!auth || !isFirebaseConfigured) {
      setErrorMessage('Firebase Authentication is not configured yet. Please check your setup.');
      return;
    }

    // Only allow authorised admin
    if (resetEmail.trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      setErrorMessage('Password reset is available for the authorised administrator account.');
      return;
    }

    setIsLoading(true);

    try {
      // Direct reset link back to application admin page with handleCodeInApp
      const currentOrigin = window.location.origin;
      const actionCodeSettings = {
        url: `${currentOrigin}/admin/login?mode=resetPassword`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, resetEmail.trim(), actionCodeSettings);
      setSuccessMessage('Password reset instructions have been sent to the administrator email address.');
    } catch (err: any) {
      console.error('sendPasswordResetEmail error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage(
          "Email/Password sign-in provider is disabled in Firebase Console. Please navigate to Firebase Console > Authentication > Sign-in method and enable 'Email/Password'."
        );
      } else if (err.code === 'auth/unauthorized-continue-uri') {
        // Fallback without actionCodeSettings if domain is not yet whitelisted in Firebase Console
        try {
          await sendPasswordResetEmail(auth, resetEmail.trim());
          setSuccessMessage('Password reset instructions have been sent to the administrator email address.');
        } catch (fallbackErr: any) {
          setErrorMessage(fallbackErr.message || 'Could not send password reset email.');
        }
      } else {
        setErrorMessage(err.message || 'Could not send password reset email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit new password
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!auth) return;

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    if (!oobCode) {
      setErrorMessage('Missing password reset security code.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setViewMode('success');
      setSuccessMessage('Your password has been reset successfully. You can now sign in.');
    } catch (err: any) {
      console.error('confirmPasswordReset error:', err);
      if (err.code === 'auth/expired-action-code' || err.code === 'auth/invalid-action-code') {
        setIsCodeValid(false);
        setErrorMessage('This password reset link is no longer valid. Please request a new reset link.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use a stronger combination of letters, numbers, or symbols.');
      } else {
        setErrorMessage(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Submit manual code
  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = manualCodeInput.trim();
    if (!cleanCode) return;
    setOobCode(cleanCode);
    setViewMode('verify');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>

        <div className="w-10 h-10 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center mb-3">
          <Key className="w-5 h-5 text-emerald-300" />
        </div>

        <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
          {viewMode === 'verify' && isCodeValid
            ? 'Create a new password'
            : viewMode === 'success'
            ? 'Password Reset Complete'
            : 'Reset Administrator Password'}
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          {viewMode === 'verify' && isCodeValid
            ? `Setting new password for ${verifiedEmail || AUTHORIZED_ADMIN_EMAIL}`
            : 'SoilWise AI Secure Administrator Recovery'}
        </p>
      </div>

      {/* Security Notice */}
      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
        <p>
          Restricted to authorized project administrator: <br />
          <strong className="text-stone-800 font-mono">{AUTHORIZED_ADMIN_EMAIL}</strong>
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* VIEW 1: Request Password Reset Link */}
      {viewMode === 'request' && !successMessage && (
        <form onSubmit={handleSendResetEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              A secure password reset link will be sent to this email address.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          <div className="pt-2 text-center border-t border-stone-200/80">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode('manual-code');
              }}
              className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Have a reset code or email link? Enter code manually
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1B: Success state after sending link */}
      {viewMode === 'request' && successMessage && (
        <div className="space-y-4 text-center pt-2">
          <p className="text-xs text-stone-600">
            Check your inbox for the reset link. Once you click the link, you will be able to set a new password.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-2.5 bg-[#1b4332] text-white text-xs font-semibold rounded-xl hover:bg-[#143225] cursor-pointer"
            >
              Return to Admin Login
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                setViewMode('manual-code');
              }}
              className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer py-1"
            >
              Already clicked email or have the code? Enter here
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: Verify & Enter New Password */}
      {viewMode === 'verify' && (
        <div>
          {isVerifyingCode ? (
            <div className="p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b4332] mx-auto" />
              <p className="text-xs text-stone-600">Validating password reset security code...</p>
            </div>
          ) : isCodeValid ? (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
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
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          ) : (
            /* Expired or invalid code state */
            <div className="space-y-4 pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setViewMode('request');
                  setOobCode(null);
                }}
                className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Request New Reset Link</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Manual Code Entry */}
      {viewMode === 'manual-code' && (
        <form onSubmit={handleManualCodeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Reset Security Code (oobCode)
            </label>
            <input
              type="text"
              required
              value={manualCodeInput}
              onChange={(e) => setManualCodeInput(e.target.value)}
              placeholder="Paste oobCode or full reset link from email"
              className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-mono focus:ring-2 focus:ring-[#1b4332]"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              If the email link does not open directly, copy the code or URL from the email.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer"
          >
            Verify Code &amp; Continue
          </button>

          <div className="pt-2 text-center border-t border-stone-200/80">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode('request');
              }}
              className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Need a link? Send email instead
            </button>
          </div>
        </form>
      )}

      {/* VIEW 4: Success */}
      {viewMode === 'success' && (
        <div className="space-y-4 text-center pt-2">
          <p className="text-xs text-stone-600">
            Your administrator password has been updated. You can now use your new password to sign in to the SoilWise AI dashboard.
          </p>
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer"
          >
            Return to Admin Login
          </button>
        </div>
      )}
    </div>
  );
};
