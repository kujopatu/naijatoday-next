export type Fixture = {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_display: string | null;
  status: 'upcoming' | 'live' | 'finished' | string;
  competition: string | null;
  active: boolean;
  sort_order: number | null;
};
