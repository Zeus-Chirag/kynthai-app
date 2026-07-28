import type { Metadata } from 'next';
import { FeedbackClient } from './feedback-client';

export const metadata: Metadata = {
  title: 'Feedback | Kynthai',
  description: 'Share your feedback with us',
};

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Feedback</h1>
        <p className="text-muted-foreground mb-8">
          Help us improve Kynthai by sharing your thoughts, reporting bugs, or
          suggesting features.
        </p>
        <FeedbackClient />
      </div>
    </main>
  );
}
