export type TrendTopic = {
  id: number;
  topic: string;
  volume: string;
  status: 'approved' | 'pending' | 'rejected' | string;
  fetched_at: string | null;
};
