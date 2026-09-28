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

export type ForumReply = {
  id: number;
  thread_id: number;
  user: string | null;
  text: string;
  upvotes: number | null;
  created_at: string;
};
