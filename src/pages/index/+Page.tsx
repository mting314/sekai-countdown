import { Metadata } from '~/components/layout/Metadata';
import { OverviewHub } from '~/components/views/OverviewHub';

export function Page() {
  return (
    <>
      <Metadata helmet />
      <OverviewHub />
    </>
  );
}
