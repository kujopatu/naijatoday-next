export default function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-6 py-24">
      <h1 className="text-3xl font-bold tracking-tight">
        NaijaToday — Next.js rebuild
      </h1>
      <p className="mt-4 text-zinc-600">
        This is the starting point for the migration from the Vite SPA.
        The article route (
        <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em]">
          /article/[category]/[slug]
        </code>
        ) and{" "}
        <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em]">
          /sitemap.xml
        </code>{" "}
        are already wired to Supabase and Cloudinary — see{" "}
        <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em]">
          MIGRATION-PLAN.md
        </code>{" "}
        for the full checklist of what's left (homepage layout, category
        listing pages, fuel_prices/data_plans pages, admin panel).
      </p>
    </div>
  );
}
