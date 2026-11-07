'use client';

import { ADMIN_EMAIL } from '@/lib/auth';
import CommentsSection from './CommentsSection';
import ReactionBar from './ReactionBar';

// One drop-in block for the article page: emoji reactions + comments.
// Add it under the article body:
//   <ArticleEngagement postId={post.id} title={post.title} author={post.author} />
export default function ArticleEngagement({
  postId,
  title,
  author,
  authorEmail,
}: {
  postId: string;
  title: string;
  author?: string | null;
  authorEmail?: string | null;
}) {
  // Same rule as the original: desk articles notify the admin.
  const notifyEmail = authorEmail || (author === 'NaijaToday Desk' ? ADMIN_EMAIL : null);
  return (
    <section className="mx-auto max-w-3xl px-4 pb-10">
      <ReactionBar postId={postId} />
      <CommentsSection postId={postId} postTitle={title} postAuthorEmail={notifyEmail} />
    </section>
  );
}
