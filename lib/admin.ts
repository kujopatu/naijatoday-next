// Matches the columns admin's post-list query actually needs — deliberately
// excludes `content` (the full article body), same optimization as the
// original: loading full HTML content for every row on every admin visit
// was unnecessary egress. Content is fetched separately only when editing
// one specific post.
export type AdminPostRow = {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  image: string | null;
  author: string | null;
  read_time: string | null;
  breaking: boolean;
  hot: boolean;
  featured: boolean;
  sponsored: boolean;
  tags: string[] | null;
  views: number;
  upvotes: number;
  comments: number;
  published: boolean;
  created_at: string;
  updated_at: string | null;
};

export type ModRequest = {
  id: number;
  email: string;
  username: string;
  requested_at: string;
};

export type ForumReport = {
  id: number;
  thread_id: number;
  target_type: 'thread' | 'reply';
  target_id: number;
  reason: string;
  reported_by: string;
  status: string;
  created_at: string;
};
