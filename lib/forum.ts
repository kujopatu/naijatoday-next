export type ForumThread = {
  id: number;
  title: string;
  body: string;
  preview: string | null;
  category: string | null;
  author: string | null;
  author_email: string | null;
  replies: number;
  views: number | string;
  hot: boolean;
  pinned: boolean;
  closed: boolean;
  status: string;
  upvotes: number | null;
  created_at: string;
};
