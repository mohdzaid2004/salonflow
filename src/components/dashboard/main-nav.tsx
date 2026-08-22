'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Scissors,
  Users,
  User,
  Settings,
  IndianRupee,
  LayoutGrid,
  Home,
  CreditCard,
  Package,
} from 'lucide-react';
import type { Salon } from '@/lib/data';

export const MainNavItems = [
  { href: '/dashboard/home', label: 'Home', icon: Home },
  { href: '/dashboard/overview', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard/billing', label: 'Billing', icon: IndianRupee },
  { href: '/dashboard/services', label: 'Services', icon: Scissors },
  { href: '/dashboard/staff', label: 'Staff', icon: User },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/my-subscription', label: 'Subscriptions', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function MainNav({ salon }: { salon: Salon | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5 px-1 py-2 select-none">
      {MainNavItems.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/dashboard/home' && pathname.startsWith(link.href));
        const Icon = link.icon;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-purple-50 text-purple-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-500'}`} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

