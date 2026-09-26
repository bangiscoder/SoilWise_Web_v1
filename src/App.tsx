/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { FarmDataForm } from './components/FarmDataForm';
import { FarmAnalysisView } from './components/FarmAnalysisView';
import { AnalysisProgressModal } from './components/AnalysisProgressModal';
import { ApiDocsModal } from './components/ApiDocsModal';
import { SoilData, FarmAnalysisResult, AnalysisStep } from './types/soilwise';
import { performFarmAnalysis } from './services/soilwiseService';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'farm-data' | 'analysis'>('landing');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [analysisResult, setAnalysisResult] = useState<FarmAnalysisResult | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-stone-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setAppError(null);
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

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
      </main>

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
