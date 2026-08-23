import { FeaturesSection } from '@/components/landing/features-section';
import { Footer } from '@/components/landing/footer';
import { Header } from '@/components/landing/header';
import { HeroSection } from '@/components/landing/hero-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { OnboardingModal } from '@/components/onboarding-modal';

export default function Home({}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <OnboardingModal />
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
