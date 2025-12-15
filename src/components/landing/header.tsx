import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="mr-6 flex items-center gap-2" prefetch={false}>
          <Logo className="h-6 w-6 text-primary" />
          <span className="hidden font-headline text-lg font-bold sm:inline-block">
            SalonFlow
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link
            href="#features"
            className="text-foreground/60 transition-colors hover:text-foreground/80"
            prefetch={false}
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-foreground/60 transition-colors hover:text-foreground/80"
            prefetch={false}
          >
            Pricing
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
