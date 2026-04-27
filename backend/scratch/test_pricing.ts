import { mdcPricingService } from '../src/services/mdc-pricing.service';

async function main() {
  try {
    const result = await mdcPricingService.calculatePrice({
      clinicTier: 'solo',
      billingCycle: 'monthly',
      selectedFeatures: ['patient-database']
    });
    console.log('Result:', result);
  } catch (err) {
    console.error('Service Error:', err);
  }
}

main();
