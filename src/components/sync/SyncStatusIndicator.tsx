import React, { useState, useRef, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  WifiOff, 
  Wifi, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ArrowUpRight,
  Database,
  ShoppingBag,
  GraduationCap
} from 'lucide-react';
import { useBackgroundSync } from '../../hooks/useBackgroundSync';

interface SyncStatusIndicatorProps {
  compact?: boolean;
  showDetailsOnClick?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  compact = false,
  showDetailsOnClick = true,
  className = '',
}) => {
  const { isOnline, isSyncing, pendingCount, lastSyncTime, items, syncNow } = useBackgroundSync();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOnline && !isSyncing) {
      await syncNow();
    }
  };

  // Determine current display state
  const getStatusConfig = () => {
    if (isSyncing) {
      return {
        label: 'Syncing...',
        sublabel: `${pendingCount} item${pendingCount === 1 ? '' : 's'} uploading`,
        colorClasses: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
        dotColor: 'bg-blue-600',
        icon: <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />,
      };
    }
    if (!isOnline) {
      return {
        label: 'Offline',
        sublabel: pendingCount > 0 ? `${pendingCount} update${pendingCount === 1 ? '' : 's'} queued` : 'Local cache active',
        colorClasses: 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200',
        dotColor: 'bg-stone-400',
        icon: <WifiOff className="w-3.5 h-3.5 text-stone-500" />,
      };
    }
    if (pendingCount > 0) {
      return {
        label: `${pendingCount} Unsynced`,
        sublabel: 'Pending connection upload',
        colorClasses: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
        dotColor: 'bg-amber-500',
        icon: <RefreshCw className="w-3.5 h-3.5 text-amber-700" />,
      };
    }
    return {
      label: 'All data synced',
      sublabel: lastSyncTime ? `Updated ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Up to date',
      colorClasses: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/80',
      dotColor: 'bg-emerald-500',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />,
    };
  };

  const config = getStatusConfig();

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Primary Pill Button */}
      <button
        type="button"
        onClick={() => showDetailsOnClick && setIsOpen(!isOpen)}
        aria-label="View background synchronization status"
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs select-none cursor-pointer ${config.colorClasses}`}
      >
        <span className="flex items-center justify-center shrink-0">
          {config.icon}
        </span>

        {!compact && (
          <span className="font-bold tracking-tight">
            {config.label}
          </span>
        )}

        {showDetailsOnClick && (
          <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Detailed Sync Status Dropdown / Popover */}
      {showDetailsOnClick && isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden text-stone-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="p-3.5 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
              <span className="font-extrabold text-xs text-stone-900">Data Sync Status</span>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Sync Stats Summary */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Pending items:</span>
              <span className="font-mono font-bold text-stone-900">{pendingCount}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Network connectivity:</span>
              <span className="font-bold text-stone-800 flex items-center gap-1">
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-stone-400" />}
                <span>{isOnline ? 'Connected' : 'Disconnected'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Last remote sync:</span>
              <span className="text-stone-700 font-mono text-[11px]">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Session start'}
              </span>
            </div>

            {/* Queued Items List */}
            {items.length > 0 && (
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 block">
                  Offline Sync Queue
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {item.type === 'seed_order' ? (
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        ) : (
                          <GraduationCap className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        )}
                        <span className="font-semibold text-stone-800 truncate">
                          {item.type === 'seed_order' 
                            ? `Seed Order: ${item.payload?.seedName || item.payload?.orderNumber || 'Inputs'}`
                            : 'Learning Progress'}
                        </span>
                      </div>

                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        item.status === 'synced'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'syncing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
            <span className="text-[11px] text-stone-500">
              {isOnline ? 'Automatic background sync' : 'Queued until reconnected'}
            </span>

            {isOnline && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#143225] disabled:bg-stone-300 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
