'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalogClockPickerProps {
  initialTime?: string; // e.g. "10:30 AM"
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export function AnalogClockPicker({
  initialTime = '10:30 AM',
  onConfirm,
  onCancel,
}: AnalogClockPickerProps) {
  // Parse initial time
  const parseTime = (timeStr: string) => {
    try {
      const parts = timeStr.trim().split(' ');
      const period = (parts[1] === 'PM' ? 'PM' : 'AM') as 'AM' | 'PM';
      const timeParts = parts[0].split(':');
      let hour = parseInt(timeParts[0], 10);
      let minute = parseInt(timeParts[1], 10);
      if (isNaN(hour) || hour < 1 || hour > 12) hour = 10;
      if (isNaN(minute) || minute < 0 || minute > 59) minute = 30;
      return { hour, minute, period };
    } catch {
      return { hour: 10, minute: 30, period: 'AM' as const };
    }
  };

  const initial = parseTime(initialTime);
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initial.period);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [isDragging, setIsDragging] = useState(false);

  const clockRef = useRef<HTMLDivElement>(null);

  const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Calculate angle for selected value
  const getHandAngle = () => {
    if (mode === 'hour') {
      return (selectedHour % 12) * 30; // 360 / 12 = 30 deg
    } else {
      return selectedMinute * 6; // 360 / 60 = 6 deg
    }
  };

  // Convert client coordinate to angle and value
  const handlePointerCalculation = useCallback(
    (clientX: number, clientY: number, isFinal: boolean = false) => {
      if (!clockRef.current) return;
      const rect = clockRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Angle from 12 o'clock in degrees (0 to 360)
      let theta = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (theta < 0) theta += 360;

      if (mode === 'hour') {
        let hour = Math.round(theta / 30);
        if (hour === 0) hour = 12;
        if (hour > 12) hour = 12;
        setSelectedHour(hour);

        if (isFinal) {
          // Auto switch to minute mode after picking hour
          setTimeout(() => {
            setMode('minute');
          }, 180);
        }
      } else {
        // Snap to nearest 5 or smooth minute
        let minute = Math.round(theta / 6) % 60;
        // Snap to nearest 5 for clean salon bookings
        const snappedMinute = Math.round(minute / 5) * 5 % 60;
        setSelectedMinute(snappedMinute);
      }
    },
    [mode]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handlePointerCalculation(e.clientX, e.clientY, false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handlePointerCalculation(e.clientX, e.clientY, false);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      handlePointerCalculation(e.clientX, e.clientY, true);
      setIsDragging(false);
    }
  };

  const formatDisplayTime = () => {
    const formattedHour = String(selectedHour).padStart(2, '0');
    const formattedMinute = String(selectedMinute).padStart(2, '0');
    return `${formattedHour}:${formattedMinute} ${selectedPeriod}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4 select-none font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
        <Clock className="w-4 h-4 text-purple-600" />
        <span>Select Time</span>
      </div>

      {/* Large Digital Display with Mode Switcher & AM/PM */}
      <div className="flex items-center justify-between w-full bg-purple-50/70 border border-purple-100 rounded-2xl p-2.5 px-4">
        <div className="flex items-center gap-1 text-2xl sm:text-3xl font-black font-mono">
          <button
            type="button"
            onClick={() => setMode('hour')}
            className={cn(
              'px-2 py-0.5 rounded-xl transition-all',
              mode === 'hour'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-purple-100/60'
            )}
          >
            {String(selectedHour).padStart(2, '0')}
          </button>
          <span className="text-slate-400 font-normal">:</span>
          <button
            type="button"
            onClick={() => setMode('minute')}
            className={cn(
              'px-2 py-0.5 rounded-xl transition-all',
              mode === 'minute'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-purple-100/60'
            )}
          >
            {String(selectedMinute).padStart(2, '0')}
          </button>
        </div>

        {/* AM / PM Toggle */}
        <div className="flex bg-slate-200/70 p-0.5 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedPeriod('AM')}
            className={cn(
              'px-3 py-1 rounded-lg transition-all',
              selectedPeriod === 'AM'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('PM')}
            className={cn(
              'px-3 py-1 rounded-lg transition-all',
              selectedPeriod === 'PM'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            PM
          </button>
        </div>
      </div>

      {/* Mode Sub-indicator */}
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {mode === 'hour' ? 'Tap or drag to select Hour' : 'Tap or drag to select Minute'}
      </div>

      {/* Analog Clock Face Container */}
      <div
        ref={clockRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-slate-50 border-4 border-purple-100 shadow-inner flex items-center justify-center cursor-pointer touch-none"
      >
        {/* Clock Center Pin */}
        <div className="absolute w-3.5 h-3.5 rounded-full bg-purple-700 z-30 shadow-xs" />

        {/* Clock Hand / Needle */}
        <div
          className="absolute origin-bottom z-10 transition-transform pointer-events-none"
          style={{
            bottom: '50%',
            left: 'calc(50% - 1.5px)',
            width: '3px',
            height: '38%',
            backgroundColor: '#7C3AED',
            transform: `rotate(${getHandAngle()}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Hand Tip Selector Circle */}
          <div className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-purple-700 shadow-md flex items-center justify-center text-white text-xs font-bold" />
        </div>

        {/* Clock Numbers Render */}
        {mode === 'hour' ? (
          HOURS.map((hr, idx) => {
            const angle = idx * 30 * (Math.PI / 180); // 30 deg per hour in radians
            const radius = 95; // px from center
            const x = Math.sin(angle) * radius;
            const y = -Math.cos(angle) * radius;
            const isSelected = selectedHour === hr;

            return (
              <div
                key={hr}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
                className={cn(
                  'absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-20 pointer-events-none transition-colors',
                  isSelected ? 'text-white font-extrabold' : 'text-slate-700'
                )}
              >
                {hr}
              </div>
            );
          })
        ) : (
          MINUTES.map((min, idx) => {
            const angle = idx * 30 * (Math.PI / 180);
            const radius = 95;
            const x = Math.sin(angle) * radius;
            const y = -Math.cos(angle) * radius;
            const isSelected = selectedMinute === min;

            return (
              <div
                key={min}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
                className={cn(
                  'absolute w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold z-20 pointer-events-none transition-colors font-mono',
                  isSelected ? 'text-white font-extrabold' : 'text-slate-700'
                )}
              >
                {String(min).padStart(2, '0')}
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(formatDisplayTime())}
          className="flex-1 h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
        >
          Confirm Time
        </button>
      </div>

    </div>
  );
}
