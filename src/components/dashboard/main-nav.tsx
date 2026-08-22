'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  Calendar,
  Users,
  Scissors,
  UserCheck,
  Package,
  IndianRupee,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react';
import type { Salon } from '@/lib/data';

export const MainNavItems = [
  { href: '/dashboard/overview', label: 'Dashboard', icon: LayoutGrid },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/services', label: 'Services', icon: Scissors },
  { href: '/dashboard/staff', label: 'Staff', icon: UserCheck },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/billing', label: 'Billing', icon: IndianRupee },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/home', label: 'Check-In', icon: UserCheck },
];

export function MainNav({ 
  salon, 
  onItemClick 
}: { 
  salon?: Salon | null; 
  onItemClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-1.5 select-none">
      {MainNavItems.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/dashboard/overview' && link.href !== '/dashboard/home' && pathname.startsWith(`${link.href}/`)) || (link.href === '/dashboard/overview' && (pathname === '/dashboard' || pathname === '/dashboard/overview'));
        const Icon = link.icon;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onItemClick}
            className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
              isActive
                ? 'bg-[#181326] text-white font-semibold shadow-xs border border-purple-900/50'
                : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#121212]'
            }`}
          >
            {/* Left Purple Indicator on Active */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#A855F7]" />
            )}

            <Icon 
              className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                isActive 
                  ? 'text-[#A855F7]' 
                  : link.href === '/dashboard/home'
                  ? 'text-amber-400 group-hover:text-amber-300'
                  : 'text-[#9CA3AF] group-hover:text-[#D1D5DB]'
              }`} 
            />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
