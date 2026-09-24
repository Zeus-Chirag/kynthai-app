import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { posts, getPostBySlug, getAllSlugs } from '@/lib/blog/posts';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `https://kynthai.app/blog/${post.slug}`,
    },
    robots: { index: true, follow: true },
  };
}

const categoryColors: Record<string, string> = {
  'Health Tips': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Family Health': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'Privacy & Security': 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  'Product Updates': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  // Simple markdown-to-HTML: headers, bold, links, lists, paragraphs
  const html = post.content
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Headers
      if (trimmed.startsWith('## ')) {
        return `<h2 class="mt-10 text-2xl font-bold tracking-tight">${trimmed.slice(3)}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 class="mt-8 text-lg font-bold tracking-tight">${trimmed.slice(4)}</h3>`;
      }

      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('1. ')) {
        const items = trimmed.split('\n').map((line) => {
          const text = line.replace(/^[-\d.]+\s+/, '');
          const linked = text.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" class="text-emerald-600 underline hover:text-emerald-700">$1</a>',
          );
          const bold = linked.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          return `<li class="mt-1">${bold}</li>`;
        });
        const tag = trimmed.startsWith('- ') ? 'ul' : 'ol';
        return `<${tag} class="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">${items.join('')}</${tag}>`;
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        return `<blockquote class="mt-4 border-l-2 border-emerald-500 pl-4 italic text-muted-foreground">${trimmed.slice(2)}</blockquote>`;
      }

      // Horizontal rule
      if (trimmed === '---') {
        return '<hr class="my-8 border-border/60" />';
      }

      // Paragraph
      const linked = trimmed.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-emerald-600 underline hover:text-emerald-700">$1</a>',
      );
      const bold = linked.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return `<p class="mt-4 leading-relaxed text-muted-foreground">${bold}</p>`;
    })
    .join('\n');

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author,
      url: 'https://kynthai.app',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kynthai',
      url: 'https://kynthai.app',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://kynthai.app/blog/${post.slug}`,
    },
  };

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back link */}
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← All posts
        </Link>
      </div>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Meta */}
        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span
            className={`rounded-full px-2.5 py-0.5 ${categoryColors[post.category] || 'bg-muted text-muted-foreground'}`}
          >
            {post.category}
          </span>
          <span>{post.readingTime} read</span>
        </div>

        {/* Title */}
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        {/* Description */}
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {post.description}
        </p>

        {/* Author & date */}
        <div className="mt-6 flex items-center gap-4 border-b border-border/60 pb-6 text-sm text-muted-foreground">
          <span className="font-medium">{post.author}</span>
          <span>·</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
          {post.updatedAt && (
            <>
              <span>·</span>
              <span>
                Updated{' '}
                {new Date(post.updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </>
          )}
        </div>

        {/* Content */}
        <div
          className="prose prose-emerald max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      {/* CTA */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">
            Take control of your family&apos;s health
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
