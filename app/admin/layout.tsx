import PageShell from '@/components/PageShell';

// Gives /admin the same header, breaking-news bar and category pills as the
// rest of the site, so there is always a Home link and navigation.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
