import Hero from '../components/Hero';
import QuickStartSteps from '../components/QuickStartSteps';
import FeatureGrid from '../components/FeatureGrid';
import FeatureTabs from '../components/FeatureTabs';
import Integrations from '../components/Integrations';
import Testimonials from '../components/Testimonials';
import PricingTable from '../components/PricingTable';
import FAQ from '../components/FAQ';

export default function Home() {
  return (
    <div>
      <Hero />
      <QuickStartSteps />
      <FeatureGrid />
      <FeatureTabs />
      <Integrations />
      <Testimonials />
      <PricingTable />
      <FAQ />
    </div>
  );
}
