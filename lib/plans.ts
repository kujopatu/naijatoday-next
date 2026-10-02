export type DataPlan = {
  id: number;
  network: string;
  name: string;
  price: number;
  data_mb: number;
  days: number;
  sort_order: number | null;
  updated_at: string | null;
};
