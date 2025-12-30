import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function HeroSection() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  return (
    <section className="relative w-full py-12 md:py-24 lg:py-32">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover object-center"
          data-ai-hint={heroImage.imageHint}
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
      <div className="container relative mx-auto grid max-w-7xl gap-6 px-4 text-primary-foreground md:px-6">
        <div className="max-w-xl space-y-4">
          <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Modernize Your Salon, Effortlessly.
          </h1>
          <p className="text-lg text-primary-foreground/80 md:text-xl">
            SalonFlow is the all-in-one platform for Indian salons. Manage bookings,
            staff, billing, and grow your business with ease.
          </p>
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
          <p className="text-sm text-primary-foreground/60">
            Simple setup in minutes.
          </p>
        </div>
      </div>
    </section>
  );
}
