import React from 'react';
import { MapPin, ShieldAlert, CheckCircle2, X, Compass, ExternalLink } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  isDenied?: boolean;
  onClose: () => void;
  onConfirmGrant: () => void;
  onManualEntry?: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  isDenied = false,
  onClose,
  onConfirmGrant,
  onManualEntry,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 text-stone-900 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isDenied ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#1b4332] text-white shadow-md'
          }`}>
            {isDenied ? <ShieldAlert className="w-6 h-6" /> : <Compass className="w-6 h-6 text-emerald-300 animate-pulse" />}
          </div>
          <div>
            <h3 className="text-lg font-black text-stone-900 tracking-tight">
              {isDenied ? 'Location Permission Blocked' : 'Grant Location Permission'}
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              SoilWise Agricultural GPS Intelligence
            </p>
          </div>
        </div>

        {isDenied ? (
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p className="bg-red-50 text-red-800 p-3.5 rounded-2xl border border-red-200 font-medium">
              Your browser or device has set location access to <strong>Denied</strong> for this site. SoilWise cannot query GPS coordinates until permission is allowed.
            </p>

            <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
              <span className="font-bold text-stone-900 block uppercase tracking-wide text-[11px]">
                How to enable location:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-stone-600 font-medium text-[11px]">
                <li>Tap the <strong>lock / site settings icon</strong> in your browser's address bar.</li>
                <li>Find <strong>Location / Permissions</strong> and toggle it to <strong>Allow</strong>.</li>
                <li>Return here and tap <strong>"Try Again"</strong> below.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p>
              To analyze your farm, SoilWise AI requests your device's exact GPS coordinates (latitude and longitude).
            </p>

            <div className="bg-[#f4f7f2] p-4 rounded-2xl border border-[#1b4332]/15 space-y-2 text-[11px]">
              <span className="font-bold text-[#1b4332] block uppercase tracking-wider text-[10px]">
                Why SoilWise needs GPS:
              </span>
              <ul className="space-y-1.5 text-stone-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Retrieves 30-meter high-resolution iSDAsoil digital soil prediction.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Fetches local rainfall onset, cessation, and weather outlook.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Verifies Nigerian State and LGA administrative boundary accuracy.</span>
                </li>
              </ul>
            </div>

            <p className="text-[11px] text-stone-500 italic">
              When prompted by your browser, tap <strong>"Allow"</strong> or <strong>"Allow while using app"</strong>.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            onClick={onConfirmGrant}
            className="w-full sm:flex-1 py-3 px-4 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
            <span>{isDenied ? 'Try Again' : 'Allow & Get My Location'}</span>
          </button>

          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="w-full sm:w-auto py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Enter Manually
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
