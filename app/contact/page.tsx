import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import ContactForm from '@/components/ContactForm';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Contact Us — NaijaToday',
  description: "Have a story tip, partnership inquiry, or feedback? We'd love to hear from you.",
};

export default async function ContactPage() {
  const [{ count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <ContactForm />
    </>
  );
}
