'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Scissors,
  Users,
  BookUser,
  Settings,
  IndianRupee,
  LayoutGrid,
  Home,
} from 'lucide-react';
import type { Salon } from '@/lib/data';

export const MainNavItems = [
  { href: '/dashboard/home', label: 'Home', icon: Home, feature: 'core' },
  { href: '/dashboard/overview', label: 'Overview', icon: LayoutGrid, feature: 'core' },
  { href: '/dashboard/services', label: 'Services', icon: Scissors, feature: 'core' },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, feature: 'core' },
  { href: '/dashboard/customers', label: 'Customers', icon: BookUser, feature: 'core' },
  { href: '/dashboard/billing', label: 'Billing', icon: IndianRupee, feature: 'core' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, feature: 'core' },
];

export function MainNav({ salon }: { salon: Salon | null }) {
  const pathname = usePathname();

  const visibleNavItems = MainNavItems.map(item => ({
    ...item,
    href: item.href.replace('/dashboard', '/(dashboard)/dashboard'),
  })).filter(item => {
    // This can be extended later if more features are conditional
    return true;
  });

  return (
    <SidebarMenu>
      {visibleNavItems.map((link) => (
        <SidebarMenuItem key={link.href}>
          <Link href={link.href}>
            <SidebarMenuButton
              isActive={pathname.startsWith(link.href.replace('/(dashboard)', '')) && (link.href.replace('/(dashboard)', '') !== '/dashboard/home' || pathname === '/dashboard/home')}
              tooltip={link.label}
            >
              <link.icon />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
