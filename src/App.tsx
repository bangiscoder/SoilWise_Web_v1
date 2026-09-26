/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { FarmDataForm } from './components/FarmDataForm';
import { FarmAnalysisView } from './components/FarmAnalysisView';
import { AnalysisProgressModal } from './components/AnalysisProgressModal';
import { ApiDocsModal } from './components/ApiDocsModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SoilData, FarmAnalysisResult, AnalysisStep } from './types/soilwise';
import { performFarmAnalysis } from './services/soilwiseService';
import { auth, AUTHORIZED_ADMIN_EMAIL } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AlertCircle, Lock } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'farm-data' | 'analysis' | 'admin-login' | 'admin-dashboard'>('landing');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [analysisResult, setAnalysisResult] = useState<FarmAnalysisResult | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [currentAdminUser, setCurrentAdminUser] = useState<string | null>(null);

  // Monitor Firebase Auth state & handle URL routing
  useEffect(() => {
    // Check initial path or hash
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (path.includes('/admin/dashboard') || hash.includes('/admin/dashboard')) {
      setCurrentView('admin-dashboard');
    } else if (path.includes('/admin') || hash.includes('/admin')) {
      setCurrentView('admin-login');
    }

    // Auth listener
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          setCurrentAdminUser(user.email);
        } else {
          setCurrentAdminUser(null);
          if (currentView === 'admin-dashboard') {
            setCurrentView('admin-login');
          }
        }
      });
      return () => unsubscribe();
    }
  }, [currentView]);

  const handleStart = () => {
    setCurrentView('farm-data');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = async (
    soilData: SoilData,
    coordinates: { latitude: number; longitude: number },
    analysisDate: string
  ) => {
    setIsSubmitting(true);
    setAppError(null);
    setAnalysisStep('preparing_data');

    try {
      const result = await performFarmAnalysis(
        soilData,
        coordinates,
        analysisDate,
        (step) => setAnalysisStep(step)
      );

      setAnalysisResult(result);
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
    setCurrentView('farm-data');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewAnalysis = () => {
    setAnalysisResult(null);
    setCurrentView('farm-data');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAdmin = () => {
    if (currentAdminUser) {
      setCurrentView('admin-dashboard');
      window.history.pushState({}, '', '/admin/dashboard');
    } else {
      setCurrentView('admin-login');
      window.history.pushState({}, '', '/admin/login');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    setCurrentView('landing');
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-stone-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Navigation (shown on main public app) */}
      {currentView !== 'admin-login' && currentView !== 'admin-dashboard' && (
        <Navbar
          currentView={currentView}
          onNavigate={(view) => {
            setAppError(null);
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenDocs={() => setIsDocsOpen(true)}
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
                <p className="font-semibold text-red-900">Analysis Request Notice</p>
                <p className="mt-0.5">{appError}</p>
              </div>
              <button
                onClick={() => setAppError(null)}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* View Routing */}
        {currentView === 'landing' && (
          <LandingPage
            onStart={handleStart}
            onOpenDocs={() => setIsDocsOpen(true)}
          />
        )}

        {currentView === 'farm-data' && (
          <FarmDataForm
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {currentView === 'analysis' && analysisResult && (
          <FarmAnalysisView
            analysis={analysisResult}
            onEdit={handleEditData}
            onNewAnalysis={handleNewAnalysis}
            onOpenDocs={() => setIsDocsOpen(true)}
          />
        )}

        {/* Admin Login Route */}
        {currentView === 'admin-login' && (
          <AdminLogin
            onSuccess={() => {
              setCurrentView('admin-dashboard');
              window.history.pushState({}, '', '/admin/dashboard');
            }}
            onBackToApp={navigateToHome}
          />
        )}

        {/* Admin Dashboard Route */}
        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            onLogout={() => {
              setCurrentView('admin-login');
              window.history.pushState({}, '', '/admin/login');
            }}
            onBackToApp={navigateToHome}
          />
        )}
      </main>

      {/* Footer with Discreet Admin Access */}
      {currentView !== 'admin-login' && currentView !== 'admin-dashboard' && (
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

      {/* API Documentation and Schema Modal */}
      <ApiDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        currentAnalysis={analysisResult}
      />
    </div>
  );
}
