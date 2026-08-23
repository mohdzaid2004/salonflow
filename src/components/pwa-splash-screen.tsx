'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/logo';

export function PWASplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Check if session has already seen the splash screen in this session
    const hasSeenSplash = sessionStorage.getItem('sf_splash_seen');
    if (hasSeenSplash) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem('sf_splash_seen', 'true');
      }, 400);
    }, 1100);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] transition-opacity duration-400 ease-out select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-300">
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-purple-600/30 blur-xl animate-pulse" />
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-2xl border border-purple-400/30">
            <Logo className="h-11 w-11 text-white" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-wider text-white font-sans">
            SALONFLOW
          </h1>
          <p className="text-xs font-medium text-purple-300/80 tracking-wide">
            Salon Management Made Simple
          </p>
        </div>

        <div className="pt-6">
          <div className="w-16 h-1 bg-purple-950 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
