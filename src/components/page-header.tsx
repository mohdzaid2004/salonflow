'use client';

import { usePathname } from 'next/navigation';
import { MainNavItems } from './dashboard/main-nav';

export function PageHeader() {
  const pathname = usePathname();
  const currentNavItem = MainNavItems.find(item => item.href === pathname);
  const title = currentNavItem ? currentNavItem.label : 'Dashboard';

  return (
    <div className="flex items-center">
      <h1 className="font-headline text-3xl md:text-4xl">{title}</h1>
    </div>
  );
}
