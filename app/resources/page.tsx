import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/products';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import ResourcesGrid from '@/components/ResourcesGrid';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Business Resources — NaijaToday',
  description:
    'Practical guides and templates to help you register your business, access funding, and trade with confidence — written specifically for Nigerians.',
};

export default async function ResourcesPage() {
  const [{ data: products }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('products').select('*').eq('active', true).order('sort_order', { ascending: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Georgia,serif', marginBottom: 8 }}>
            📚 NaijaToday Business Resources
          </div>
          <div style={{ fontSize: 14, color: '#8892a4', maxWidth: 560, margin: '0 auto' }}>
            Practical guides and templates to help you register your business, access funding, and
            trade with confidence — written specifically for Nigerians.
          </div>
        </div>

        <ResourcesGrid products={(products ?? []) as Product[]} />
      </div>
    </>
  );
}
