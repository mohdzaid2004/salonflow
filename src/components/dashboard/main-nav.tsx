'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutGrid,
  Scissors,
  Users,
  BookUser,
  Settings,
  IndianRupee,
  CalendarClock
} from 'lucide-react';

export const MainNavItems = [
  { href: '/dashboard/overview', label: 'Dashboard', icon: LayoutGrid },
  { href: '/dashboard', label: 'Appointments', icon: CalendarClock },
  { href: '/dashboard/services', label: 'Services', icon: Scissors },
  { href: '/dashboard/staff', label: 'Staff', icon: Users },
  { href: '/dashboard/customers', label: 'Customers', icon: BookUser },
  { href: '/dashboard/billing', label: 'Billing', icon: IndianRupee },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {MainNavItems.map((link) => (
        <SidebarMenuItem key={link.href}>
          <Link href={link.href}>
            <SidebarMenuButton
              isActive={pathname === link.href}
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
