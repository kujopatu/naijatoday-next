export type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  type: string | null;
  deadline: string | null;
  category: string | null;
  logo: string | null;
  apply_url: string | null;
  description: string | null;
  requirements: string | null;
  experience_level: string | null;
  posted_date: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Scholarship = {
  id: number;
  title: string;
  provider: string;
  deadline: string | null;
  country: string | null;
  fully: boolean;
  level: string | null;
  field: string | null;
  apply_url: string | null;
  created_at: string;
  updated_at: string | null;
};
