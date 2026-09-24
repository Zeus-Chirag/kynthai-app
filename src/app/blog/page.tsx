import { Metadata } from 'next';
import Link from 'next/link';
import { posts } from '@/lib/blog/posts';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Health tips, family wellness advice, and product updates from Kynthai — your family\'s connected health companion.',
  openGraph: {
    title: 'Kynthai Blog — Health Tips & Family Wellness',
    description:
      'Health tips, family wellness advice, and product updates from Kynthai.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kynthai Blog — Health Tips & Family Wellness',
    description:
      'Health tips, family wellness advice, and product updates from Kynthai.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

const categoryColors: Record<string, string> = {
  'Health Tips': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Family Health': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'Privacy & Security': 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  'Product Updates': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

export default function BlogPage() {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Kynthai Blog
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Health tips &amp; updates
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Practical advice for family health management, medication adherence,
            privacy, and what we&apos;re building at Kynthai.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          {sorted.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg hover:shadow-emerald-950/5"
            >
              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <span
                  className={`rounded-full px-2.5 py-0.5 ${categoryColors[post.category] || 'bg-muted text-muted-foreground'}`}
                >
                  {post.category}
                </span>
                <span>{post.readingTime} read</span>
              </div>

              <h2 className="mt-4 text-xl font-bold tracking-tight">
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {post.description}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{post.author}</span>
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              </div>
            </article>
          ))}
        </div>

        {sorted.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No posts yet. Check back soon.
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to manage your family&apos;s health?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Free to start. No credit card required.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Get started free
          </Link>
        </div>
      </section>
    </main>
  );
}
