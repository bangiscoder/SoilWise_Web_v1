import React, { useState } from 'react';
import { 
  Sprout, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { translateAuthError } from '../../services/authService';

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
  onBackToApp: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
  onBackToApp,
}) => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setIsSuccess(true);
    } catch (err: any) {
      // For security, if user is not found, do not reveal it
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setIsSuccess(true);
      } else {
        setErrorMessage(translateAuthError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 sm:py-12 bg-[#fafaf7]">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-lg space-y-6">
        {/* Back Link */}
        <button
          onClick={onNavigateToLogin}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center mx-auto shadow-md">
            <Sprout className="w-6 h-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Success Confirmation */}
        {isSuccess ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs sm:text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Password Reset Email Sent</span>
              </div>
              <p className="leading-relaxed text-emerald-800">
                If an account exists for <strong className="font-semibold text-emerald-950">{email}</strong>, we have sent instructions to reset your password. Please check your inbox and spam folder.
              </p>
            </div>

            <button
              onClick={onNavigateToLogin}
              className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Return to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Error Notice */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed flex-1">{errorMessage}</p>
              </div>
            )}

            {/* Email Reset Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 block">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Sending Reset Email...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer Link to Login */}
        <div className="text-center text-xs text-stone-600 pt-2 border-t border-stone-100">
          <span>Remembered your password? </span>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-bold text-[#1b4332] hover:underline cursor-pointer ml-1"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};
