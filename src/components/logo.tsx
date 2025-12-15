import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>SalonFlow Logo</title>
      <path d="M14.5 6.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-1.5" />
      <path d="M17 12.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-1.5" />
      <path d="m3 12 6 6" />
      <path d="m3 6 6 6" />
      <path d="M12 3v18" />
    </svg>
  );
}
