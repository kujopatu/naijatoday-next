export type FuelPrice = {
  id: number;
  state: string;
  price: number;
  trend: 'stable' | 'up' | 'down' | string;
  updated_at: string;
};
