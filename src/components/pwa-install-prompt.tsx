'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already in standalone app mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // Check if dismissed recently (7 days)
    const dismissedTimestamp = localStorage.getItem('sf_pwa_dismissed_at');
    if (dismissedTimestamp) {
      const daysSinceDismissed = (Date.now() - Number(dismissedTimestamp)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('sf_pwa_dismissed_at', String(Date.now()));
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-40 bg-[#0F0F12] border border-purple-500/30 rounded-2xl p-4 shadow-2xl text-white animate-in slide-in-from-bottom duration-300 select-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-600/40">
            <Logo className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white">Install SalonFlow</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              Install the SalonFlow app for a faster, app-like experience.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
        <Button
          type="button"
          onClick={handleInstall}
          className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Install App
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDismiss}
          className="h-9 px-3 rounded-xl border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
        >
          Not Now
        </Button>
      </div>
    </div>
  );
}
