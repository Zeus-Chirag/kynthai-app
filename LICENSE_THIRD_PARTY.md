# Third-Party Software Attributions

> **Kyntha** incorporates open-source and third-party software components. Each component
> is the property of its respective owner and is subject to its own license terms.
> This file provides attribution and license references for all major dependencies.
>
> Last updated: 2025-06-28 | Kyntha version: 0.2.0

---

## Dependency Notice

The Kyntha application ("Application") bundles and makes use of the following
third-party software packages ("Components"). The full license text for each
Component is available at the URL provided. This list covers the **major packages**
used in the project; a complete list can be regenerated at any time from
`package.json` using the command:

```
npx license-checker --summary
```

---

## Attribution Table

| Package | Version (pinned in package.json) | License | Copyright / Author | License URL |
|---|---|---|---|---|
| **Next.js** | ^16.1.1 | MIT | Vercel, Inc. & contributors | https://github.com/vercel/next.js/blob/canary/license.md |
| **React** | ^19.0.0 | MIT | Meta Platforms, Inc. and contributors | https://github.com/facebook/react/blob/main/LICENSE |
| **Tailwind CSS** | ^4 (dev) | MIT | Tailwind Labs, Inc. | https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE |
| **@tailwindcss/postcss** | ^4 | MIT | Tailwind Labs, Inc. | https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE |
| **Radix UI** (accordion, alert-dialog, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip) | various ≤ ^2.x | MIT | Modulz, Inc. (d.b.a. Radix UI) | https://github.com/radix-ui/primitives/blob/main/LICENSE |
| **cmdk** | ^1.1.1 | MIT | Paco Coursey | https://github.com/pacocoursey/cmdk/blob/main/LICENSE.md |
| **Lucide React** | ^0.525.0 | ISC | Lucide Contributors | https://github.com/lucide-icons/lucide/blob/main/LICENSE |
| **Recharts** | ^3.8.1 | MIT | Recharts Team | https://github.com/recharts/recharts/blob/master/LICENSE |
| **Framer Motion** | ^12.40.0 | MIT | Matt Perry / Framer | https://github.com/framer/motion/blob/main/LICENSE.md |
| **Zod** | ^3.23.8 | MIT | Colin McDonnell | https://github.com/colinhacks/zod/blob/master/LICENSE |
| **Zustand** | ^5.0.14 | MIT | Paul Henschel | https://github.com/pmndrs/zustand/blob/main/LICENSE |
| **Prisma** (engine + client) | ^6.11.1 | Apache-2.0 | Prisma (formerly Prisma.io) | https://github.com/prisma/prisma/blob/main/LICENSE |
| **Stripe** | ^22.2.2 | MIT | Stripe, Inc. | https://github.com/stripe/stripe-node/blob/master/LICENSE |
| **OpenAI SDK** | ^6.45.0 | Apache-2.0 | OpenAI, Inc. | https://github.com/openai/openai-node/blob/main/LICENSE |
| **ZenMux** *(via ZAI_MODEL / AI provider)* | N/A (API service) | Proprietary (API T&C) | ZenMux / ZenMux Labs | https://zenmux.ai/ (or equivalent vendor T&C) |

### Additional Notable Dependencies

| Package | License |
|---|---|
| date-fns | MIT |
| embla-carousel-react | MIT |
| react-hook-form | MIT |
| @hookform/resolvers | MIT |
| @tanstack/react-query | MIT |
| @tanstack/react-table | MIT |
| clsx | MIT |
| tailwind-merge | MIT |
| tailwindcss-animate | MIT |
| class-variance-authority | MIT |
| bcryptjs | MIT |
| sonner | MIT |
| vaul | MIT |
| twilio | BSD-3-Clause |
| @sentry/nextjs | Business Source License 1.1 |
| react-markdown | MIT |
| socket.io-client | MIT |
| uuid | MIT |
| react-resizable-panels | MIT |
| input-otp | MIT |
| dnd-kit (core, sortable, utilities) | MIT |
| cmdk | MIT |
| react-day-picker | MIT |
| sharp | Apache-2.0 |
| @upstash/redis | MIT |
| @upstash/ratelimit | MIT |

---

## Community-Contributed Libraries: Icons & Design

> **Note:** Icon glyphs sourced from **Lucide** (ISC license) and **Tabler Icons** (MIT license)
> are embedded as SVG paths within the codebase. See the source comment header of each
> icon component for the exact attribution line. No physical font files from third-party
> icon sets are shipped in this build.

---

## Indemnification Notice

To the fullest extent permitted by law, Kyntha Health Technologies Pvt. Ltd. makes
no warranty, express or implied, as to the fitness, reliability, or accuracy of
any third-party component. Licensee indemnifies Kyntha against any claims arising
from Licensee's use of the Software in combination with, or in reliance on,
any third-party component or service.

---

## Attribution Display

Kyntha displays this attribution notice in the application's About / Legal page.
The full list of dependencies and their license types is also automatable via:

```bash
npx license-checker --json > licenses.json
```

---

© 2024 Kyntha Health Technologies Pvt. Ltd. | hello@kyntha.app
