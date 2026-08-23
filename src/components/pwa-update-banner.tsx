'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAUpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdate(false);
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-3 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[#0F0F12] border border-purple-500/40 rounded-2xl p-3.5 shadow-2xl text-white flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-xl bg-purple-900/60 text-purple-400 flex items-center justify-center shrink-0 border border-purple-700/40">
          <RefreshCw className="w-4 h-4 animate-spin" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white truncate">New version available</h4>
          <p className="text-[10px] text-slate-400 truncate">Update SalonFlow to get the latest improvements.</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={handleUpdate}
          className="h-7 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px]"
        >
          Update Now
        </Button>
        <button
          type="button"
          onClick={() => setShowUpdate(false)}
          className="text-slate-400 hover:text-white p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
