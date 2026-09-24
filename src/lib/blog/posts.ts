export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  category: string;
  readingTime: string;
}

export const posts: BlogPost[] = [
  {
    slug: 'smart-medication-reminders-families',
    title: 'How Smart Medication Reminders Keep Families Healthy',
    description:
      'Medication non-adherence costs $200B+ annually in the US. Learn how smart reminders, family coordination, and gentle nudges help your household stay on track.',
    content: `
## The Problem

Nearly half of Americans don't take their medications as prescribed. For families managing multiple prescriptions — parents, children, elderly relatives — the cost of missed doses goes beyond money. It means worsening conditions, emergency visits, and unnecessary stress.

## Why Traditional Reminders Fail

Phone alarms get silenced. Sticky notes fade. Memory fails. The real issue isn't intention — it's coordination. A household where three people take different medications at different times needs more than a single alarm clock.

## How Smart Reminders Help

Modern medication reminder apps go beyond a basic alarm:

- **Adaptive scheduling** — reminders adjust to your routine, not the other way around
- **Family visibility** — caregivers see who took what, in real time
- **Smart nudges** — if you miss a dose, the app follows up gently instead of shouting
- **Refill alerts** — never run out of medication unexpectedly
- **Doctor sharing** — your care team sees your adherence data at your next visit

## Building Habits That Stick

The goal isn't to nag — it's to build automatic habits. Research shows that consistent reminders within a 30-minute window of the scheduled time improve adherence by up to 50%. The best systems combine:

1. A reliable schedule
2. Gentle escalation if a dose is missed
3. Positive reinforcement (streak tracking, family encouragement)
4. Simple one-tap confirmation

## Getting Started

You don't need to overhaul your life. Start by entering one medication into a health companion app and setting a single reminder. Once that becomes automatic, add the rest. Your future self will thank you.

---

*Kynthai helps families manage medications with smart reminders, family coordination, and privacy-first design. [Get started free](/register).*
    `,
    publishedAt: '2025-09-15',
    author: 'Kynthai Team',
    category: 'Health Tips',
    readingTime: '4 min',
  },
  {
    slug: 'family-health-management-2025',
    title: 'Family Health Management in 2025: What Actually Works',
    description:
      'Managing a family\'s health involves medications, appointments, lab results, and more. Here\'s what works in practice — and what to skip.',
    content: `
## The Reality of Family Health

Between school physicals, chronic conditions, elderly parent care, and your own checkups, the average family juggles dozens of health-related tasks every month. Most of this falls on one person — and that person is overwhelmed.

## What Actually Works

After studying how families manage health day-to-day, the patterns are clear:

### 1. One Central Place

Scattered across multiple apps, paper folders, and memory doesn't scale. A single health companion that covers medications, appointments, and family members eliminates the chaos.

### 2. Role-Based Access

Not everyone needs to see everything. The parent managing a child's medications should have a different view than the teenager, and different from the elderly parent. Smart health apps let each family member see what's relevant to them.

### 3. Automated Over Manual

If a family member has a weekly medication, entering it manually every week is a recipe for failure. Set it once, get reminders automatically.

### 4. Shareable with Doctors

When you walk into a doctor's appointment, having your medication history, adherence data, and recent lab results ready saves time and improves care. Health apps that let you share this information directly with your doctor are worth their weight in gold.

## What to Skip

- **Social health apps** — your medication data isn't social content
- **Overly complex platforms** — if it takes 20 minutes to log a dose, you won't do it
- **Apps without privacy guarantees** — your health data is personal; treat it that way

## The Bottom Line

The best family health system is one that's simple enough to use daily, powerful enough to coordinate a household, and private enough to trust with sensitive data.

---

*Kynthai is a family health companion that brings medications, reminders, doctor consultations, and family coordination into one privacy-first app. [Try it free](/register).*
    `,
    publishedAt: '2025-09-08',
    author: 'Kynthai Team',
    category: 'Family Health',
    readingTime: '5 min',
  },
  {
    slug: 'privacy-health-apps-what-to-know',
    title: 'Privacy in Health Apps: What You Should Know Before Signing Up',
    description:
      'Your health data is sensitive. Not every health app handles it that way. Here\'s how to evaluate privacy before you sign up.',
    content: `
## Your Health Data Is Valuable — and Vulnerable

Health data is among the most personal information you have. It reveals your conditions, medications, habits, and more. Yet many health apps treat this data carelessly — sharing with advertisers, selling to data brokers, or storing it insecurely.

## Red Flags to Watch For

Before signing up for any health app, check for these warning signs:

- **Vague privacy policies** — if you can't understand what they do with your data, that's deliberate
- **Third-party sharing without consent** — legitimate apps ask before sharing your data
- **No data export or deletion** — you should be able to leave and take your data with you
- **Unencrypted storage** — your health data should be encrypted at rest and in transit
- **Free without limits** — if the product is free and there's no clear business model, your data might be the product

## What Good Privacy Looks Like

A health app that respects your privacy will:

1. **Encrypt everything** — data in transit (TLS) and at rest (AES-256)
2. **Minimize data collection** — only collect what's needed for the service
3. **Never sell your data** — the business model is the service, not your information
4. **Give you control** — export, delete, and manage your data easily
5. **Be transparent** — clear, readable privacy policies that explain exactly what happens with your data

## The HIPAA Question

Many people ask "Is this app HIPAA compliant?" Here's the nuance: HIPAA applies to healthcare providers and their business associates. Most consumer health apps aren't covered entities. What matters is whether the app follows the same principles — encryption, access controls, audit logging — even when not legally required.

## Your Right to Privacy

You have the right to know what happens with your health data. Before signing up for any health app, spend two minutes reading the privacy policy. Look for: what they collect, who they share it with, how to delete your data, and whether they encrypt it.

---

*Kynthai is built with privacy-first principles: encrypted data, no data selling, easy export and deletion, and transparent policies. [Learn more](/privacy).*
    `,
    publishedAt: '2025-09-01',
    author: 'Kynthai Team',
    category: 'Privacy & Security',
    readingTime: '5 min',
  },
  {
    slug: 'kynthai-whats-new-september-2025',
    title: 'Kynthai: What\'s New in September 2025',
    description:
      'New features, improvements, and what\'s coming next for Kynthai health companion.',
    content: `
## September Updates

We've been building. Here's what shipped this month:

### Smart Alarm Improvements

Our medication alarm system now features a medical-grade beep tone that gets your attention without the creepiness of old-school alarms. Alarms auto-stop after 30 seconds so they don't disrupt your day if you're away from your phone.

### Family Coordination

Caregivers can now see medication adherence across all family members in a single dashboard. No more guessing whether Mom took her blood pressure medication — the answer is right there.

### Doctor Consultations

Video consultations with doctors are now available directly in the app. No need for separate telemedicine apps — your health companion handles everything from scheduling to the call itself.

### Lab Test Booking

Book lab tests through the app and receive results directly. Your health data stays in one place, and your care team can review results alongside your medication history.

### Privacy Enhancements

- End-to-end encryption for all health data
- Transparent data export and deletion
- No third-party data sharing — ever
- HIPAA-grade security practices (even though we're not a covered entity)

## What's Coming Next

- **Voice health assistant** — ask health questions in natural language
- **Insurance integration** — connect your insurance for automated claims
- **Wearable sync** — connect Apple Watch, Fitbit, and other wearables
- **Multi-language support** — Spanish, Hindi, and more

## Thank You

Every feature we build is driven by what families actually need. If you have feedback, reach out at hello@kynthai.app — we read every message.

---

*Kynthai is free to start. [Create your account](/register) and see what connected health feels like.*
    `,
    publishedAt: '2025-09-20',
    author: 'Kynthai Team',
    category: 'Product Updates',
    readingTime: '3 min',
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return posts.filter((p) => p.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(posts.map((p) => p.category))];
}
