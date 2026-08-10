'use client'
import { Fragment } from 'react'

/**
 * Cloudflare Email Address Obfuscation rewrites emails in SSR HTML but NEVER
 * inside <script>/client JS. A hydrated client component therefore renders the
 * plain address while the server HTML holds the obfuscated form → React
 * hydration mismatch (Minified React error #418) in production builds.
 *
 * Real CF transforms (verified against pristine production HTML):
 *  - plain inline email  →  <a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="…">[email&#160;protected]</a>
 *  - <a className>email</a>  →  <a href="/cdn-cgi/l/email-protection#…" class="…orig…"><span class="__cf_email__">[email&#160;protected]</span></a>
 *  - <a href="mailto:…">non-email text</a>  →  href rewritten only, text untouched
 *
 * These components render the CLIENT-side structure that matches each server
 * shape exactly (element-for-element), with `suppressHydrationWarning` on the
 * text-bearing element so React accepts the obfuscated server text instead of
 * throwing.
 */
export function ContactEmail({
  address,
  className,
  children,
}: {
  address: string
  className?: string
  children?: React.ReactNode
}) {
  // When a className is present the server anchor keeps it and wraps the email
  // text in an inner span — mirror that structure. With no className, CF emits
  // the email as a direct text child — mirror that too. Explicit children
  // (button labels etc.) stay untouched: CF only rewrites the href for those.
  const body = children ?? (className ? <span suppressHydrationWarning>{address}</span> : address)
  return (
    <a href={`mailto:${address}`} className={className} suppressHydrationWarning>
      {body}
    </a>
  )
}

/** Inline email inside a sentence (not an anchor). With a className the
 *  server anchor keeps the class and wraps the email in an inner span, so the
 *  client mirrors that structure (same as ContactEmail); without a className,
 *  CF emits the obfuscated text as the anchor's direct child, which the client
 *  mirrors too. */
export function ContactEmailText({
  address,
  className,
}: {
  address: string
  className?: string
}) {
  const body = className ? <span suppressHydrationWarning>{address}</span> : address
  return (
    <a href={`mailto:${address}`} className={className} suppressHydrationWarning>
      {body}
    </a>
  )
}

/** Splits a plain string on any embedded email addresses and renders each
 *  address via ContactEmailText so CF-obfuscated server HTML can't trigger
 *  hydration mismatches. Non-email parts render as bare text fragments (no
 *  extra elements) so the element structure matches the server exactly. */
export function TextWithEmails({ text, className }: { text: string; className?: string }) {
  const EMAIL_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g
  const parts = text.split(EMAIL_RE)
  return (
    <>
      {parts.map((part, i) =>
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(part) ? (
          <ContactEmailText key={i} address={part} className={className} />
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}
