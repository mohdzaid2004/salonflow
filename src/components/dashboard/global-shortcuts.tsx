'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modified with Ctrl, Cmd, Alt, Shift
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Check if user is typing in an input, textarea, select, or contenteditable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName?.toLowerCase();
        const isEditable = target.isContentEditable || 
          tagName === 'input' || 
          tagName === 'textarea' || 
          tagName === 'select';
        if (isEditable) return;
      }

      // Check if a modal/dialog with input is currently active and focused
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      // Check for 'N' or 'n' key
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        router.push('/dashboard/appointments?new=true');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname]);

  return null;
}
