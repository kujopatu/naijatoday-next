'use client';

import DataCalculator from './widgets/DataCalculator';
import FixturesSidebar from './widgets/FixturesSidebar';
import FollowBox from './widgets/FollowBox';
import FuelPriceWidget from './widgets/FuelPriceWidget';
import InflationCalculator from './widgets/InflationCalculator';
import NairaRateWidget from './widgets/NairaRateWidget';
import ProductsSidebar from './widgets/ProductsSidebar';

// Everything that sits under the newsletter box in the homepage sidebar,
// in the same order as the original site.
export default function SidebarWidgets() {
  return (
    <>
      <FollowBox />
      <NairaRateWidget />
      <InflationCalculator />
      <FuelPriceWidget />
      <DataCalculator />
      <FixturesSidebar />
      <ProductsSidebar />
    </>
  );
}
