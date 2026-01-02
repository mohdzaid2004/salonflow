'use client';

import { usePathname } from 'next/navigation';
import { MainNavItems } from './dashboard/main-nav';

export function PageHeader() {
  const pathname = usePathname();
  
  const getTitle = () => {
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
  

  return (
    <div className="flex items-center">
      <h1 className="font-headline text-3xl md:text-4xl">{getTitle()}</h1>
    </div>
  );
}
