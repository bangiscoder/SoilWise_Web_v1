/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FarmDataForm } from './components/FarmDataForm';
import { FarmAnalysisView } from './components/FarmAnalysisView';
import { AnalysisProgressModal } from './components/AnalysisProgressModal';
import { ApiDocsModal } from './components/ApiDocsModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SoilDataTestView } from './components/admin/SoilDataTestView';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { UserAreaView } from './components/auth/UserAreaView';
import { AnalysisHistoryView } from './components/history/AnalysisHistoryView';
import { SoilData, FarmAnalysisResult, AnalysisStep } from './types/soilwise';
import { performFarmAnalysis } from './services/soilwiseService';
import { saveAnalysisSnapshot, getAnalysisSnapshot } from './services/analysisHistoryService';
import { useAuth } from './context/AuthContext';
import { AlertCircle, Lock } from 'lucide-react';

export type AppView = 
  | 'farm-data' 
  | 'analysis' 
  | 'login' 
  | 'register' 
  | 'forgot-password' 
  | 'account' 
  | 'my-analyses'
  | 'admin-login' 
  | 'admin-dashboard' 
  | 'admin-soil-data-test';

export default function App() {
  const { currentUser, isAdmin: isAdminUser, isLoading: isAuthLoading } = useAuth();

  // Start directly with Farm Analysis as the primary experience
  const [currentView, setCurrentView] = useState<AppView>('farm-data');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [analysisResult, setAnalysisResult] = useState<FarmAnalysisResult | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Historical result mode tracking
  const [isHistoricalView, setIsHistoricalView] = useState<boolean>(false);
  const [historicalSavedDate, setHistoricalSavedDate] = useState<string | null>(null);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Monitor URL routes on mount and popstate
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
      
      const mode = searchParams.get('mode') || hashParams.get('mode');
      const oobCode = searchParams.get('oobCode') || hashParams.get('oobCode');

      // Admin password reset / action links
      if (mode === 'resetPassword' || oobCode || path.includes('/reset-password') || hash.includes('/reset-password')) {
        setCurrentView('admin-login');
      } else if (path.includes('/admin/soil-data-test') || hash.includes('/admin/soil-data-test')) {
        setCurrentView('admin-soil-data-test');
      } else if (path.includes('/admin/dashboard') || hash.includes('/admin/dashboard')) {
        setCurrentView('admin-dashboard');
      } else if (path.includes('/admin') || hash.includes('/admin')) {
        setCurrentView('admin-login');
      } else if (path.includes('/login') || hash.includes('/login')) {
        setCurrentView('login');
      } else if (path.includes('/register') || hash.includes('/register')) {
        setCurrentView('register');
      } else if (path.includes('/forgot-password') || hash.includes('/forgot-password')) {
        setCurrentView('forgot-password');
      } else if (path.includes('/account') || hash.includes('/account')) {
        setCurrentView('account');
      } else if (path.includes('/my-analyses') || path.includes('/analyses') || hash.includes('/my-analyses')) {
        setCurrentView('my-analyses');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Protected route enforcement
  useEffect(() => {
    if (!isAuthLoading) {
      if ((currentView === 'account' || currentView === 'my-analyses') && !currentUser) {
        // Unauthenticated access to protected user area -> redirect to login
        setCurrentView('login');
      } else if ((currentView === 'login' || currentView === 'register') && currentUser) {
        // Authenticated user on login/register -> redirect to account
        setCurrentView('account');
      } else if ((currentView === 'admin-dashboard' || currentView === 'admin-soil-data-test') && !isAdminUser) {
        // Non-admin trying to access admin dashboard -> redirect to admin-login
        setCurrentView('admin-login');
      }
    }
  }, [currentView, currentUser, isAdminUser, isAuthLoading]);

  const handleFormSubmit = async (
    soilData: SoilData,
    coordinates: { latitude: number; longitude: number },
    analysisDate: string,
    locationDetails?: { state?: string; lga?: string },
    soilTestMeta?: {
      hasSoilTest?: boolean;
      soilDataProvenance?: 'user_measured' | 'location_estimated' | 'unavailable';
      soilPhotoProvided?: boolean;
      soilPhoto?: string | null;
      soilTextureImageEstimate?: {
        texture: string;
        confidence: number;
        source: 'image_estimate';
        status: 'preliminary';
      } | null;
      photoAnalysisResult?: {
        estimatedTextureClass?: string;
        confidence?: number;
        fileName?: string;
      } | null;
      locationValidation?: import('./types/soilDataValidation').LocationValidationResult | null;
    }
  ) => {
    setIsSubmitting(true);
    setAppError(null);
    setSaveStatusMessage(null);
    setIsHistoricalView(false);
    setHistoricalSavedDate(null);
    setAnalysisStep('preparing_data');

    try {
      const result = await performFarmAnalysis(
        soilData,
        coordinates,
        analysisDate,
        (step) => setAnalysisStep(step),
        locationDetails,
        soilTestMeta
      );

      setAnalysisResult(result);

      // If user is authenticated, save analysis snapshot to their account history
      if (currentUser) {
        try {
          const saveRes = await saveAnalysisSnapshot(result, currentUser.uid);
          if (!saveRes.success) {
            setSaveStatusMessage('Your analysis is ready, but we could not automatically save it to your account history.');
          } else {
            setSaveStatusMessage(null);
          }
        } catch (saveErr) {
          console.warn('Background save analysis error:', saveErr);
          setSaveStatusMessage('Your analysis is ready, but we could not automatically save it to your account history.');
        }
      }

      // Small pause to let user see completion
      setTimeout(() => {
        setIsSubmitting(false);
        setAnalysisStep('idle');
        setCurrentView('analysis');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 350);
    } catch (err: any) {
      console.error('Analysis execution error:', err);
      setIsSubmitting(false);
      setAnalysisStep('idle');
      setAppError(
        'Environmental information could not be retrieved. Please check your connection and try again.'
      );
    }
  };

  const handleEditData = () => {
    setIsHistoricalView(false);
    setHistoricalSavedDate(null);
    setSaveStatusMessage(null);
    setCurrentView('farm-data');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewAnalysis = () => {
    setAnalysisResult(null);
    setIsHistoricalView(false);
    setHistoricalSavedDate(null);
    setSaveStatusMessage(null);
    setCurrentView('farm-data');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenHistoricalAnalysis = async (analysisId: string) => {
    if (!currentUser) return;
    setAppError(null);
    try {
      const snapshot = await getAnalysisSnapshot(currentUser.uid, analysisId);
      if (snapshot && snapshot.fullAnalysis) {
        setAnalysisResult(snapshot.fullAnalysis);
        setIsHistoricalView(true);
        setHistoricalSavedDate(snapshot.createdAt);
        setSaveStatusMessage(null);
        setCurrentView('analysis');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setAppError('Could not find the requested historical analysis record.');
      }
    } catch (err) {
      console.error('Failed to open historical analysis:', err);
      setAppError('Could not load the requested saved analysis. Please try again.');
    }
  };

  const handleRetrySave = async () => {
    if (!currentUser || !analysisResult) return;
    try {
      const saveRes = await saveAnalysisSnapshot(analysisResult, currentUser.uid);
      if (saveRes.success) {
        setSaveStatusMessage(null);
      } else {
        setSaveStatusMessage(saveRes.error || 'Could not save analysis. Please check your internet connection.');
      }
    } catch (err) {
      setSaveStatusMessage('Could not save analysis. Please check your internet connection.');
    }
  };

  const navigateToAdmin = () => {
    if (isAdminUser) {
      setCurrentView('admin-dashboard');
      window.history.pushState({}, '', '/admin/dashboard');
    } else {
      setCurrentView('admin-login');
      window.history.pushState({}, '', '/admin/login');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    setIsHistoricalView(false);
    setHistoricalSavedDate(null);
    setSaveStatusMessage(null);
    setCurrentView('farm-data');
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToView = (view: AppView) => {
    setAppError(null);
    setCurrentView(view);
    const path = view === 'farm-data' ? '/' : `/${view}`;
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Guard for Data Architecture & API: only authorized administrator may open
  const handleOpenDocs = () => {
    if (!isAdminUser) {
      setAppError('Admin access required.');
      navigateToAdmin();
      return;
    }
    setIsDocsOpen(true);
  };

  const isNavVisible = 
    currentView !== 'admin-login' && 
    currentView !== 'admin-dashboard' && 
    currentView !== 'admin-soil-data-test';

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-stone-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Navigation (shown on main app views) */}
      {isNavVisible && (
        <Navbar
          currentView={currentView}
          onNavigate={(view) => navigateToView(view as AppView)}
          onOpenDocs={handleOpenDocs}
          isAdmin={isAdminUser}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Global Error Banner */}
        {appError && (
          <div className="max-w-3xl mx-auto mt-4 px-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs sm:text-sm text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Notice</p>
                <p className="mt-0.5">{appError}</p>
              </div>
              <button
                onClick={() => setAppError(null)}
                className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* 1. Primary Experience: Farm Analysis Form */}
        {currentView === 'farm-data' && (
          <FarmDataForm
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {/* 2. Results Page (Supports both live and historical analysis mode) */}
        {currentView === 'analysis' && analysisResult && (
          <FarmAnalysisView
            analysis={analysisResult}
            onEdit={handleEditData}
            onNewAnalysis={handleNewAnalysis}
            onOpenDocs={handleOpenDocs}
            isAdmin={isAdminUser}
            isHistorical={isHistoricalView}
            savedDate={historicalSavedDate ? new Date(historicalSavedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
            onBackToHistory={() => navigateToView('my-analyses')}
            saveStatusMessage={saveStatusMessage}
            onRetrySave={handleRetrySave}
          />
        )}

        {/* 3. Public Login Page */}
        {currentView === 'login' && (
          <LoginPage
            onSuccess={() => navigateToView('account')}
            onNavigateToRegister={() => navigateToView('register')}
            onNavigateToForgotPassword={() => navigateToView('forgot-password')}
            onBackToApp={navigateToHome}
          />
        )}

        {/* 4. Public Registration Page */}
        {currentView === 'register' && (
          <RegisterPage
            onSuccess={() => navigateToView('account')}
            onNavigateToLogin={() => navigateToView('login')}
            onBackToApp={navigateToHome}
          />
        )}

        {/* 5. Public Forgot Password Page */}
        {currentView === 'forgot-password' && (
          <ForgotPasswordPage
            onNavigateToLogin={() => navigateToView('login')}
            onBackToApp={navigateToHome}
          />
        )}

        {/* 6. User Analysis History ("My Analyses") */}
        {currentView === 'my-analyses' && (
          currentUser ? (
            <AnalysisHistoryView
              onOpenAnalysis={handleOpenHistoricalAnalysis}
              onNewAnalysis={handleNewAnalysis}
            />
          ) : (
            <LoginPage
              onSuccess={() => navigateToView('my-analyses')}
              onNavigateToRegister={() => navigateToView('register')}
              onNavigateToForgotPassword={() => navigateToView('forgot-password')}
              onBackToApp={navigateToHome}
            />
          )
        )}

        {/* 7. Protected User Area ("My Account") */}
        {currentView === 'account' && (
          currentUser ? (
            <UserAreaView
              onNavigateToAnalysis={navigateToHome}
              onNavigateToHistory={() => navigateToView('my-analyses')}
              onLogout={navigateToHome}
            />
          ) : (
            <LoginPage
              onSuccess={() => navigateToView('account')}
              onNavigateToRegister={() => navigateToView('register')}
              onNavigateToForgotPassword={() => navigateToView('forgot-password')}
              onBackToApp={navigateToHome}
            />
          )
        )}

        {/* 8. Admin Login Route */}
        {currentView === 'admin-login' && (
          <AdminLogin
            onSuccess={() => {
              setCurrentView('admin-dashboard');
              window.history.pushState({}, '', '/admin/dashboard');
            }}
            onBackToApp={navigateToHome}
          />
        )}

        {/* 9. Admin Dashboard Route (Admin only) */}
        {currentView === 'admin-dashboard' && (
          isAdminUser ? (
            <AdminDashboard
              onLogout={() => {
                setCurrentView('admin-login');
                window.history.pushState({}, '', '/admin/login');
              }}
              onBackToApp={navigateToHome}
              onOpenSoilDataTest={() => {
                setCurrentView('admin-soil-data-test');
                window.history.pushState({}, '', '/admin/soil-data-test');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
            <AdminLogin
              onSuccess={() => {
                setCurrentView('admin-dashboard');
                window.history.pushState({}, '', '/admin/dashboard');
              }}
              onBackToApp={navigateToHome}
            />
          )
        )}

        {/* 10. Developer Soil Data & GPS Validation Test (Admin only) */}
        {currentView === 'admin-soil-data-test' && (
          isAdminUser ? (
            <SoilDataTestView
              onBackToApp={navigateToHome}
              onGoToDashboard={() => {
                setCurrentView('admin-dashboard');
                window.history.pushState({}, '', '/admin/dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
            <AdminLogin
              onSuccess={() => {
                setCurrentView('admin-soil-data-test');
                window.history.pushState({}, '', '/admin/soil-data-test');
              }}
              onBackToApp={navigateToHome}
            />
          )
        )}
      </main>

      {/* Footer with Discreet Admin Access */}
      {isNavVisible && (
        <footer className="py-6 border-t border-stone-200/80 bg-stone-50/50 text-center text-xs text-stone-500">
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>SoilWise AI &bull; Agricultural Intelligence MVP</span>
            <button
              onClick={navigateToAdmin}
              className="text-stone-500 hover:text-[#1b4332] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          </div>
        </footer>
      )}

      {/* Analysis Progress Dialog */}
      {isSubmitting && <AnalysisProgressModal currentStep={analysisStep} />}

      {/* API Documentation and Schema Modal (Protected for Admin) */}
      {isAdminUser && (
        <ApiDocsModal
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
          currentAnalysis={analysisResult}
        />
      )}
    </div>
  );
}
