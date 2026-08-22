'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  Calendar,
  Users,
  Scissors,
  UserCheck,
  IndianRupee,
  Package,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { Salon } from '@/lib/data';

export const MainNavItems = [
  { href: '/dashboard/overview', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/services', label: 'Services', icon: Scissors },
  { href: '/dashboard/staff', label: 'Staff', icon: UserCheck },
  { href: '/dashboard/billing', label: 'Billing', icon: IndianRupee },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function MainNav({ salon }: { salon: Salon | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-1 select-none">
      {MainNavItems.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 ${
              isActive
                ? 'bg-purple-50 text-purple-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
