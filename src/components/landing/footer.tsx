import Link from 'next/link';
import { Logo } from '@/components/logo';

export function Footer() {
  return (
    <footer className="w-full border-t bg-card">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-headline text-lg">SalonFlow</span>
        </div>
        <p className="text-sm text-foreground/60">
          © {new Date().getFullYear()} SalonFlow India. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="text-sm text-foreground/60 hover:text-foreground"
            prefetch={false}
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-sm text-foreground/60 hover:text-foreground"
            prefetch={false}
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
