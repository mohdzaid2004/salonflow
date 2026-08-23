'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  IndianRupee, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  Check, 
  X,
  Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

const ONBOARDING_SLIDES = [
  {
    icon: <Scissors className="w-8 h-8 text-purple-400" />,
    title: 'SALONFLOW',
    tagline: 'Everything your salon needs to run smoothly.',
    description: 'An all-in-one salon operating system designed for owners, front desk receptionists, and stylists.',
    gradient: 'from-purple-900/50 to-indigo-950/80',
  },
  {
    icon: <Calendar className="w-8 h-8 text-purple-400" />,
    title: 'Effortless Appointments',
    tagline: 'Manage appointments effortlessly.',
    description: 'Real-time booking calendars, chair status, walk-in check-ins, and multi-staff daily schedules.',
    gradient: 'from-blue-900/50 to-purple-950/80',
  },
  {
    icon: <Users className="w-8 h-8 text-pink-400" />,
    title: 'Client Relationships',
    tagline: 'Know your customers.',
    description: 'Detailed customer visit logs, service histories, loyalty points rewards, and automatic birthday tracking.',
    gradient: 'from-pink-900/50 to-purple-950/80',
  },
  {
    icon: <IndianRupee className="w-8 h-8 text-emerald-400" />,
    title: 'Instant POS & Invoicing',
    tagline: 'Bill faster and get paid easily.',
    description: 'Generate itemized receipts in seconds, accept UPI / Cards / Cash, and auto-dispatch WhatsApp invoices.',
    gradient: 'from-emerald-900/50 to-purple-950/80',
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-amber-400" />,
    title: 'Smart Salon Growth',
    tagline: 'Grow your salon with smart insights.',
    description: 'Live revenue tracking, staff commission reports, service profitability, and repeat customer retention.',
    gradient: 'from-amber-900/50 to-purple-950/80',
  },
];

export function OnboardingModal({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const hasSeenOnboarding = localStorage.getItem('sf_onboarding_completed');
    if (!hasSeenOnboarding && typeof window !== 'undefined' && window.location.pathname === '/') {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleFinish = (action: 'signup' | 'login' | 'close') => {
    localStorage.setItem('sf_onboarding_completed', 'true');
    setIsOpen(false);
    if (onClose) onClose();
    if (action === 'signup') {
      router.push('/signup');
    } else if (action === 'login') {
      router.push('/login');
    }
  };

  if (!isOpen) return null;

  const slide = ONBOARDING_SLIDES[currentSlide];
  const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-[#0F0F12] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden flex flex-col justify-between min-h-[480px]">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Skip */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-purple-950 flex items-center justify-center text-purple-400 border border-purple-800/40">
              <Logo className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <span className="text-xs font-bold tracking-wider text-slate-400 font-mono">SALONFLOW GUIDE</span>
          </div>

          <button
            type="button"
            onClick={() => handleFinish('close')}
            className="text-xs text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slide Content */}
        <div className="relative z-10 py-6 text-center space-y-4 my-auto">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/20 shadow-lg mx-auto">
            {slide.icon}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {slide.title}
            </h2>
            <p className="text-sm font-semibold text-purple-400">
              &ldquo;{slide.tagline}&rdquo;
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {slide.description}
          </p>
        </div>

        {/* Pagination Dots */}
        <div className="relative z-10 flex justify-center items-center gap-1.5 py-2">
          {ONBOARDING_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'w-6 bg-purple-500' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Bottom Action Buttons */}
        <div className="relative z-10 pt-4 space-y-2">
          {isLast ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => handleFinish('signup')}
                className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25"
              >
                GET STARTED
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleFinish('login')}
                className="flex-1 h-11 rounded-xl border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider"
              >
                LOGIN
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleFinish('close')}
                className="text-xs text-slate-400 hover:text-white font-semibold px-2 py-1"
              >
                Skip
              </button>
              <Button
                type="button"
                onClick={() => setCurrentSlide((prev) => prev + 1)}
                className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
