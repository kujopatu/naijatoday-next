export type Product = {
  id: number;
  title: string;
  category: string | null;
  short_description: string | null;
  cover_image: string | null;
  price_naira: number | null;
  price_usd: number | null;
  selar_link: string | null;
  gumroad_link: string | null;
  active: boolean;
  sort_order: number | null;
  created_at: string;
};
