# ARIA / Accessibility Audit — Kyntha (WCAG 2.2 AA)

## Methodology
- Source: all `src/**/*.tsx` files (client islands + shared UI)
- Grepped for: `onClick`, `role=`, `aria-label`, `aria-labelledby`, `aria-hidden`, `aria-expanded`, `aria-controls`, `dialog`, `role="dialog"`, `role="alert"`, `<button`, `<input`, `<textarea`, `<select`, `href="#"`
- Read every file that surfaced as interactive-element-candidate (≈ 40 files)

---

## CRITICAL (automated checkers will flag; screen-reader users blocked)

### FIND-001  `src/components/kyntha/caretaker/member-schedule.tsx:116`
**Title-only icon button — zero accessible name**

```tsx
<button onClick={...} className="text-muted-foreground text-xs">✕</button>
```

The dismiss button on the medication alarm overlay contains only the Unicode character `✕`.
There is no `aria-label`, no `title`, and no visible text that a screen reader can reliably
announce. VoiceOver/NVDA will read this as blank or as the literal glyph "multiplication X",
giving no indication that the button dismisses the alarm.

**Fix:** add `aria-label="Dismiss alarm"` (or reuse the visible label text).

---

## HIGH (user confusion, keyboard + AT friction)

### FIND-002  `src/components/kyntha/landing-nav.tsx:56-61`
**Brand logo button — empty accessible name**

```tsx
<button onClick={() => goScreen('landing')} className="flex items-center">
  <KynthaBrand />
</button>
```

`KynthaBrand` renders a decorative logo SVG with no `title`/`aria-label`. The surrounding
`<button>` has no accessible name. Screen reader users hear "button" with no label.

**Fix:** add `aria-label="Kyntha home"` to the `<button>` (or add `role="img"` + `aria-label`
to the SVG inside `KynthaBrand`).

---

### FIND-003  Multiple pages — "Back" button lacks `type` attribute
**Affects:** `login-page.tsx:256`, `checkout-page.tsx:213`, `onboarding.tsx`, `not-found-client.tsx:27`

```tsx
<button onClick={() => router.push('/')} className="...">
  <ArrowLeft className="h-4 w-4" /> Back
</button>
```

No explicit `type="button"`. Inside a `<form>` (e.g. login-page's auth form, checkout's
payment form) a bare `<button>` defaults to `type="submit"`. A keyboard user pressing Enter
or a screen-reader user activating the button will unintentionally submit the form.

**Fix:** add `type="button"` to all non-submit buttons that sit inside forms.

---

### FIND-004  `src/components/kyntha/landing-page.tsx:963`
**Inline `<button>` inside a `<p>` — `href=#`-style navigation without keyboard support**

```tsx
<button onClick={() => onGetStarted('login')} className="text-emerald-600 underline">
  sign in
</button>
```

A `<button>` inside a paragraph navigates to a new screen. While technically keyboard-
focusable, the pattern confuses AT: VoiceOver reads it as "button, sign in" but the
user expectation for underlined inline text is a link, not a button.

**Fix:** replace with Next.js `<Link href="/login">` (or add `role="link"`).

---

### FIND-005  `src/components/kyntha/landing-nav.tsx:56` — Navigation landmark branding
**Logo button inside `<header>` duplicates `<nav>` landmark**

Slight structural issue: the logo `<button>` lives directly inside `<header>` while the main
navigation link group is inside `<nav aria-label="Main">`. When a screen-reader user enters
the page, they hear two landmarks in the header region (the implicit banner + nav) with no
clear heading. Not a failure, but combined with FIND-002 the brand button is invisible to AT.

**Fix:** resolve FIND-002; consider adding an `aria-label` or `<h1>` skip-link inside the
header for orientation.

---

## MEDIUM (WCAG technique deficiencies; potential WCAG failure at scale)

### FIND-006  `src/components/kyntha/landing-nav.tsx:232-241` (mobile menu)
**`aria-expanded` / `aria-controls` not wired to the mobile drawer**

```tsx
<button
  onClick={() => setOpen((o) => !o)}
  aria-label="Toggle menu"
  aria-expanded={open}
>
```

`aria-expanded` is present but there is **no `aria-controls`** pointing to the drawer element,
so screen-reader users cannot determine whether activating it will show or hide a panel, or
which element it targets. The drawer itself also lacks an `id` to receive the association.

**Fix:** add `aria-controls="mobile-menu"` and give the drawer `<div>` `id="mobile-menu"`.

---

### FIND-007  `src/components/kyntha/landing-nav.tsx:106-113` — Menu toggle has no visual
focus indicator enhancement
*(Styling-only; behaviour is fine, but with custom rounded borders + `hover:` only,
keyboard focus ring is minimal. Combined with the aria-controls gap in FIND-006, the
toggle is the only mobile navigation affordance.)*

**Fix:** add a `focus-visible:ring-2` class (most shadcn buttons already do this; verify).

---

## LOW (nice-to-have; not failures today)

### FIND-008  Procedural `div` with `role="button"` pattern — not present
Checked: no raw `<div role="button">` patterns found. The `role="button"` on `<Card>`
(`landing-page.tsx:650`) is paired with `tabIndex={0}`, full `onKeyDown` handler, and
`aria-label`. ✓ Passes WCAG 4.1.2.

### FIND-009  Decorative elements
All decorative spans, gradient divs, and emoji use `aria-hidden="true"` or `aria-hidden`.
✓ Passes. One inconsistency: `login-page.tsx:244` has bare `aria-hidden` (no truthy value
string) — HTML spec treats bare `aria-hidden` as `true`, so it works, but add `="true"` for
consistency.

### FIND-010  No `href="#"` or `href="javascript:void(0)"` dummy links found.
✓ Passes. All navigation uses Next.js `<Link>` or `<button>`.

### FIND-011  Social icon links in `landing-footer.tsx:46-57`
All five social links have `aria-label={s.label}`. ✓ Passes. They also have proper
`target="_blank"` + `rel="noopener noreferrer"`. ✓ Passes.

---

## Summary Table

| ID   | Severity | File | Line | Pattern | WCAG ref |
|------|----------|------|------|---------|----------|
| FIND-001 | CRITICAL | member-schedule.tsx | 116 | Button with zero accessible name | 4.1.2 |
| FIND-002 | HIGH | landing-nav.tsx | 56 | Brand button with zero accessible name | 4.1.2 |
| FIND-003 | HIGH | login/checkout/onboarding | — | Missing `type="button"` in forms | 4.1.2 |
| FIND-004 | HIGH | landing-page.tsx | 963 | Button-as-link inside paragraph | 1.3.1, 4.1.2 |
| FIND-005 | HIGH | landing-nav.tsx | 56 | Header landmark without label | 1.3.1 |
| FIND-006 | MEDIUM | landing-nav.tsx | 106 | `aria-controls` missing on menu toggle | 4.1.2 |
| FIND-007 | MEDIUM | landing-nav.tsx | 106 | Focus-ring gap on mobile toggle | 2.4.7 |
| FIND-008 | LOW | — | — | No raw `div[role=button]` anti-pattern | 4.1.2 |
| FIND-009 | LOW | login-page.tsx | 244 | Bare `aria-hidden` (works; inconsistent) | — |
| FIND-010 | LOW | — | — | No `href="#"` dummy links | — |
| FIND-011 | LOW | landing-footer.tsx | 46 | Social links fully labeled | — |

---

## Recommended Fix Priority

1. **FIND-001** — Add `aria-label="Dismiss alarm"` to the ✕ button (1-line change)
2. **FIND-002** — Add `aria-label="Kyntha home"` to the brand button (1-line change)
3. **FIND-003** — Add `type="button"` to all navigation/close buttons inside forms (5 files, 1-line each)
4. **FIND-004** — Replace inline `<button>` with Next.js `<Link>` (1-line change)
5. **FIND-006** — Add `aria-controls` + drawer `id` to mobile menu toggle (2-line change)

These five fixes close all HIGH and CRITICAL findings with < 15 lines of total change.
