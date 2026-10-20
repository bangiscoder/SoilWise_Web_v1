import React, { useState } from 'react';
import { WifiOff, Download, Check, X, Smartphone, Sparkles } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const OfflineBanner: React.FC = () => {
  const { isOnline, offlineReady, dismissOfflineReady, canInstall, isInstalled, isIOS, triggerInstall } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    const accepted = await triggerInstall();
    if (accepted) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  return (
    <>
      {/* Offline Status Notice */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 shadow-md relative z-50">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
          <span>
            <strong>Offline Mode:</strong> Viewing cached SoilWise modules, learning curriculum, and seed catalogue. Live features will sync once connected.
          </span>
        </div>
      )}

      {/* Offline Ready Toast Notification */}
      {offlineReady && isOnline && (
        <div className="fixed bottom-4 left-4 z-50 bg-[#1b4332] text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/30 flex items-center gap-3 text-xs max-w-sm animate-in fade-in slide-in-from-bottom duration-300">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 pr-2">
            <p className="font-bold">Offline Viewing Ready</p>
            <p className="text-emerald-100/80 text-[11px]">Critical app assets cached. SoilWise works even without internet.</p>
          </div>
          <button
            onClick={dismissOfflineReady}
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Install App Bar (Suppressed if already installed) */}
      {canInstall && !isInstalled && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={handleInstallClick}
            className="bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2.5 rounded-2xl shadow-xl hover:shadow-2xl border border-emerald-400/30 transition-all flex items-center gap-2 text-xs font-bold active:scale-95 cursor-pointer group"
          >
            <Smartphone className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
            <span>Install SoilWise App</span>
            <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">PWA</span>
          </button>
        </div>
      )}

      {/* iOS Safari Guided Install Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 text-stone-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1b4332] text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-emerald-300" />
                </div>
                <h3 className="font-extrabold text-base">Install on iOS Safari</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              To install <strong>SoilWise AI</strong> on your iPhone or iPad for offline farm use:
            </p>

            <ol className="text-xs text-stone-700 space-y-2.5 list-decimal list-inside bg-stone-50 p-4 rounded-2xl border border-stone-200/60 font-medium">
              <li>Tap the <strong>Share button</strong> in Safari's bottom navigation bar.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-[#1b4332] text-white text-xs font-bold rounded-xl hover:bg-[#143225] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
