'use client';

import { usePathname } from 'next/navigation';
import { MainNavItems } from './dashboard/main-nav';

export function PageHeader() {
  const pathname = usePathname();
  
  const getTitle = () => {
    // Hide title on settings page
    if (pathname === '/dashboard/settings') {
      return '';
    }

    // Exact match for home/overview
    const exactMatch = MainNavItems.find(item => item.href === pathname);
    if (exactMatch) return exactMatch.label;

    // Handle dynamic routes like /customers/[id]
    if (pathname.startsWith('/dashboard/customers/')) {
        return 'Customer Details';
    }

    // Default title
    return 'Dashboard';
  }
  
  const title = getTitle();

  if (!title) {
    return null;
  }

  return (
    <div className="flex items-center">
      <h1 className="font-headline text-3xl md:text-4xl">{title}</h1>
    </div>
  );
}
